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
        session = InterviewSession.objects.create(user=request.user, target_role=target_role)
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
            question = InterviewQuestion.objects.get(pk=pk, session__user=request.user)
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

        result = call_ai_service(
            "POST",
            "/api/v1/interview/answer/score",
            payload={
                "question_id": str(pk),
                "question_text": question.question_text,
                "user_answer": user_answer,
                "target_role": question.session.target_role,
            },
        )
        question.user_answer = user_answer
        question.ai_feedback = result.get("ai_feedback", "")
        question.score = result.get("score")
        question.save(update_fields=["user_answer", "ai_feedback", "score"])

        return Response({"ai_feedback": question.ai_feedback, "score": question.score})
