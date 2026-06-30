import logging
import uuid
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

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
        from core.tasks import _broker_reachable
        if not _broker_reachable():
            return Response({"status": "pending", "result": None})
        try:
            from celery.result import AsyncResult
            result = AsyncResult(str(job_id))
            if result.state == "SUCCESS":
                return Response({"status": "done", "result": result.result})
            elif result.state in ("FAILURE", "REVOKED"):
                # Check if we have a stored error message
                try:
                    job = AsyncJob.objects.filter(celery_task_id=job_id).first()
                    if job and job.error_message:
                        return Response({"status": "failed", "error": job.error_message})
                except Exception as db_exc:
                    logger.exception("Failed to load AsyncJob for %s: %s", job_id, db_exc)
                return Response({"status": "failed", "error": "Processing failed. Try again."})
        except Exception as exc:
            logger.exception("Async job status lookup failed for %s: %s", job_id, exc)
        return Response({"status": "pending", "result": None})
