import uuid
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.resumes.models import Resume
from core.tasks import safe_apply_async
from .models import JobMatch, AsyncJob
from .serializers import JobMatchSerializer, AsyncJobSerializer
from .tasks import generate_job_matches


class JobMatchGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        resume_id = request.data.get("resume_id")
        if not resume_id:
            return Response(
                {"error": {"code": "bad_request", "message": "resume_id is required.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            Resume.objects.get(pk=resume_id, user=request.user, status="parsed")
        except Resume.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": "Parsed resume not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        job_id = str(uuid.uuid4())
        safe_apply_async(
            generate_job_matches,
            args=[str(request.user.id), str(resume_id)],
            task_id=job_id,
        )
        return Response({"job_id": job_id}, status=status.HTTP_202_ACCEPTED)


class JobMatchListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        matches = JobMatch.objects.filter(user=request.user).order_by("-created_at")
        return Response(JobMatchSerializer(matches, many=True).data)


class JobMatchUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            match = JobMatch.objects.get(pk=pk, user=request.user)
        except JobMatch.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": "Job match not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        new_status = request.data.get("status")
        if new_status not in ("saved", "applied", "dismissed"):
            return Response(
                {"error": {"code": "bad_request", "message": "Invalid status value.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        match.match_status = new_status
        match.save(update_fields=["match_status", "updated_at"])
        return Response(JobMatchSerializer(match).data)


class AsyncJobStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        from celery.result import AsyncResult
        result = AsyncResult(str(job_id))
        if result.state == "PENDING":
            return Response({"status": "pending", "result": None})
        elif result.state == "SUCCESS":
            return Response({"status": "done", "result": result.result})
        elif result.state in ("FAILURE", "REVOKED"):
            return Response({"status": "failed", "result": None})
        return Response({"status": "pending", "result": None})
