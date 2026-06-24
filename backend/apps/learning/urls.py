from django.urls import path
from .views import RoadmapGenerateView, RoadmapListView, LearningResourceUpdateView

urlpatterns = [
    path("learning/roadmaps/generate/", RoadmapGenerateView.as_view(), name="roadmap-generate"),
    path("learning/roadmaps/", RoadmapListView.as_view(), name="roadmap-list"),
    path("learning/resources/<uuid:pk>/", LearningResourceUpdateView.as_view(), name="resource-update"),
]
