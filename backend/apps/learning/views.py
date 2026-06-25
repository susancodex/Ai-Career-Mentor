import uuid
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.careers.models import SkillGap
from core.tasks import safe_apply_async
from .models import LearningRoadmap, LearningResource
from .serializers import LearningRoadmapSerializer, LearningResourceSerializer
from .tasks import generate_roadmap


class RoadmapGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        skill_gap_id = request.data.get("skill_gap_id")
        if not skill_gap_id:
            return Response(
                {"error": {"code": "bad_request", "message": "skill_gap_id is required.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            SkillGap.objects.get(pk=skill_gap_id, user=request.user)
        except SkillGap.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": "Skill gap not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        job_id = str(uuid.uuid4())
        safe_apply_async(
            generate_roadmap,
            args=[str(request.user.id), str(skill_gap_id)],
            task_id=job_id,
        )
        return Response({"job_id": job_id}, status=status.HTTP_202_ACCEPTED)


class RoadmapListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        roadmaps = LearningRoadmap.objects.filter(user=request.user).order_by("-created_at")
        return Response(LearningRoadmapSerializer(roadmaps, many=True).data)


class LearningResourceUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            resource = LearningResource.objects.get(pk=pk, roadmap__user=request.user)
        except LearningResource.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": "Resource not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        completed = request.data.get("completed")
        if completed is None:
            return Response(
                {"error": {"code": "bad_request", "message": "completed field is required.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        resource.completed = bool(completed)
        resource.save(update_fields=["completed"])
        return Response(LearningResourceSerializer(resource).data)
