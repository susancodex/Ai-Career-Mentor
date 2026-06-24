import uuid
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsOwner
from .models import Resume, ResumeAnalysis
from .serializers import ResumeSerializer, ResumeCreateSerializer, ResumeAnalysisSerializer
from .tasks import analyze_resume


class ResumeListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ResumeCreateSerializer
        return ResumeSerializer

    def get_queryset(self):
        return Resume.objects.filter(user=self.request.user).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        serializer = ResumeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resume = serializer.save(user=request.user)
        # Enqueue async analysis — returns 201 immediately
        analyze_resume.delay(str(resume.id))
        return Response(ResumeSerializer(resume).data, status=status.HTTP_201_CREATED)


class ResumeDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = ResumeSerializer

    def get_queryset(self):
        return Resume.objects.filter(user=self.request.user)

    def get_object(self):
        try:
            resume = Resume.objects.get(pk=self.kwargs["pk"], user=self.request.user)
        except (Resume.DoesNotExist, ValueError):
            raise NotFound("Resume not found.")
        return resume


class ResumeAnalysisView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            resume = Resume.objects.get(pk=pk, user=request.user)
        except (Resume.DoesNotExist, ValueError):
            raise NotFound("Resume not found.")

        try:
            analysis = resume.analysis
        except ResumeAnalysis.DoesNotExist:
            raise NotFound("Analysis not available yet — resume may still be processing.")

        return Response(ResumeAnalysisSerializer(analysis).data)
