import uuid
from django.db import models
from django.contrib.auth import get_user_model
from apps.resumes.models import Resume

User = get_user_model()


class AsyncJob(models.Model):
    """Tracks Celery async task status for polling via GET /jobs/async-status/{job_id}/"""

    class Status(models.TextChoices):
        PENDING = "pending"
        DONE = "done"
        FAILED = "failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="async_jobs")
    task_name = models.CharField(max_length=255)
    celery_task_id = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    result = models.JSONField(null=True, blank=True)
    error_message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class JobMatch(models.Model):
    class MatchStatus(models.TextChoices):
        NEW = "new"
        SAVED = "saved"
        APPLIED = "applied"
        DISMISSED = "dismissed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="job_matches")
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name="job_matches")
    job_title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    fit_score = models.FloatField(default=0.0)
    fit_explanation = models.TextField(blank=True)
    external_url = models.URLField(blank=True)
    salary_range = models.CharField(max_length=255, blank=True)
    match_status = models.CharField(max_length=20, choices=MatchStatus.choices, default=MatchStatus.NEW)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
