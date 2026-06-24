from django.urls import path
from .views import ResumeListCreateView, ResumeDetailView, ResumeAnalysisView

urlpatterns = [
    path("resumes/", ResumeListCreateView.as_view(), name="resume-list-create"),
    path("resumes/<uuid:pk>/", ResumeDetailView.as_view(), name="resume-detail"),
    path("resumes/<uuid:pk>/analysis/", ResumeAnalysisView.as_view(), name="resume-analysis"),
]
