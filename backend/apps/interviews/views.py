import uuid
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.ai_client import call_ai_service
from core.tasks import safe_apply_async
from .models import InterviewSession, InterviewQuestion
from .serializers import InterviewSessionSerializer, InterviewQuestionSerializer
from .tasks import generate_interview_questions


class InterviewSessionCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        target_role = request.data.get("target_role", "")
        if not target_role:
            return Response(
                {"error": {"code": "bad_request", "message": "target_role is required.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Optional resume link — when provided, questions are anchored to real resume content.
        resume_id = request.data.get("resume_id")
        resume = None
        if resume_id:
            from apps.resumes.models import Resume
            try:
                resume = Resume.objects.get(pk=resume_id, user=request.user, status="parsed")
            except Resume.DoesNotExist:
                return Response(
                    {"error": {"code": "not_found", "message": "Parsed resume not found.", "details": {}}},
                    status=status.HTTP_404_NOT_FOUND,
                )

        session = InterviewSession.objects.create(
            user=request.user,
            target_role=target_role,
            resume=resume,
        )
        return Response(InterviewSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class InterviewSessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            session = InterviewSession.objects.get(pk=pk, user=request.user)
        except InterviewSession.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": "Session not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(InterviewSessionSerializer(session).data)


class InterviewQuestionsGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            InterviewSession.objects.get(pk=pk, user=request.user)
        except InterviewSession.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": "Session not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        job_id = str(uuid.uuid4())
        safe_apply_async(generate_interview_questions, args=[str(pk)], task_id=job_id)
        return Response({"job_id": job_id}, status=status.HTTP_202_ACCEPTED)


class InterviewAnswerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            question = InterviewQuestion.objects.select_related("session__resume").get(
                pk=pk, session__user=request.user
            )
        except InterviewQuestion.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": "Question not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        user_answer = request.data.get("user_answer", "")
        if not user_answer:
            return Response(
                {"error": {"code": "bad_request", "message": "user_answer is required.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build a short resume context string for the scorer so it can verify
        # whether the answer aligns with the candidate's actual experience.
        resume_context = None
        session = question.session
        if session.resume_id:
            try:
                from apps.resumes.models import ResumeAnalysis
                analysis = ResumeAnalysis.objects.filter(resume_id=session.resume_id).first()
                if analysis:
                    skills = (analysis.extracted_skills or [])[:20]
                    history = analysis.work_history or []
                    history_lines = "; ".join(
                        f"{e.get('title')} at {e.get('company')}"
                        for e in history[:5]
                        if e.get("title") and e.get("company")
                    )
                    resume_context = f"Skills: {', '.join(skills)}. Work history: {history_lines}."
            except Exception:
                pass

        result = call_ai_service(
            "POST",
            "/api/v1/interview/answer/score",
            payload={
                "question_id": str(pk),
                "question_text": question.question_text,
                "user_answer": user_answer,
                "target_role": session.target_role,
                "resume_context": resume_context,
            },
        )
        question.user_answer = user_answer
        question.ai_feedback = result.get("ai_feedback", "")
        question.score = result.get("score")
        question.strengths = result.get("strengths") or []
        question.improvements = result.get("improvements") or []
        question.save(update_fields=["user_answer", "ai_feedback", "score", "strengths", "improvements"])

        return Response({
            "ai_feedback": question.ai_feedback,
            "score": question.score,
            "strengths": question.strengths,
            "improvements": question.improvements,
        })
