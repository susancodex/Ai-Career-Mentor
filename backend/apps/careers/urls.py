from django.urls import path
from .views import CareerPathGenerateView, CareerPathListView, SkillGapView

urlpatterns = [
    path("careers/paths/generate/", CareerPathGenerateView.as_view(), name="career-paths-generate"),
    path("careers/paths/", CareerPathListView.as_view(), name="career-paths-list"),
    path("careers/skill-gaps/<uuid:resume_id>/", SkillGapView.as_view(), name="skill-gap"),
]
