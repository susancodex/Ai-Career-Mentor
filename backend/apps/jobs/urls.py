from django.urls import path
from .views import JobMatchGenerateView, JobMatchListView, JobMatchUpdateView, AsyncJobStatusView

urlpatterns = [
    path("jobs/matches/generate/", JobMatchGenerateView.as_view(), name="job-matches-generate"),
    path("jobs/matches/", JobMatchListView.as_view(), name="job-matches-list"),
    path("jobs/matches/<uuid:pk>/", JobMatchUpdateView.as_view(), name="job-match-update"),
    path("jobs/async-status/<str:job_id>/", AsyncJobStatusView.as_view(), name="async-job-status"),
]
