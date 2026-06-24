from django.urls import path
from .views import (
    InterviewSessionCreateView,
    InterviewSessionDetailView,
    InterviewQuestionsGenerateView,
    InterviewAnswerView,
)

urlpatterns = [
    path("interviews/sessions/", InterviewSessionCreateView.as_view(), name="interview-session-create"),
    path("interviews/sessions/<uuid:pk>/", InterviewSessionDetailView.as_view(), name="interview-session-detail"),
    path(
        "interviews/sessions/<uuid:pk>/questions/generate/",
        InterviewQuestionsGenerateView.as_view(),
        name="interview-questions-generate",
    ),
    path("interviews/questions/<uuid:pk>/answer/", InterviewAnswerView.as_view(), name="interview-answer"),
]
