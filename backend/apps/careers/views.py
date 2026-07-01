import uuid
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.resumes.models import Resume
from core.tasks import safe_apply_async
from .models import CareerPath, SkillGap
from .serializers import CareerPathSerializer, SkillGapSerializer
from .tasks import run_full_career_analysis


class CareerPathGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        resume_id = request.data.get("resume_id")
        # Normalize target_role on the way in so "Engineering Manager" and
        # "  engineering manager  " resolve to the same cached result.
        target_role = (request.data.get("target_role") or "").strip()
        force_regenerate = request.data.get("force_regenerate", False)

        if not resume_id:
            return Response(
                {"error": {"code": "bad_request", "message": "resume_id is required.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not target_role:
            return Response(
                {"error": {"code": "bad_request", "message": "target_role is required.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            resume = Resume.objects.get(pk=resume_id, user=request.user, status="parsed")
        except Resume.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": "Parsed resume not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Case-insensitive lookup: "Engineering Manager" and "engineering manager"
        # must resolve to the same cached row, not create two separate results.
        existing = CareerPath.objects.filter(
            user=request.user, resume=resume, target_role__iexact=target_role
        ).first()

        if existing and not force_regenerate:
            return Response(
                {"cached": True, "result": CareerPathSerializer(existing).data},
                status=status.HTTP_200_OK,
            )

        # Delete stale row before regenerating so update_or_create in the task is clean.
        if existing and force_regenerate:
            existing.delete()

        job_id = str(uuid.uuid4())
        safe_apply_async(
            run_full_career_analysis,
            args=[str(request.user.id), str(resume_id), target_role],
            task_id=job_id,
        )
        return Response({"job_id": job_id}, status=status.HTTP_202_ACCEPTED)


class CareerPathListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        paths = CareerPath.objects.filter(user=request.user).order_by("-created_at")
        return Response(CareerPathSerializer(paths, many=True).data)


class SkillGapView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, resume_id):
        target_role = request.query_params.get("target_role", "")
        qs = SkillGap.objects.filter(user=request.user, resume_id=resume_id)
        if target_role:
            qs = qs.filter(target_role__iexact=target_role)
        obj = qs.order_by("-created_at").first()
        if not obj:
            return Response(
                {"error": {"code": "not_found", "message": "Skill gap not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(SkillGapSerializer(obj).data)
