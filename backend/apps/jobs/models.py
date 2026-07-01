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


class JobPosting(models.Model):
    """
    Cache of real job listings fetched from an external source (Remotive API).

    Populated by refresh_job_matches. Storing listings separately means we can
    re-score them for different users without re-fetching, and the apply_url is
    always a real clickable link from the source — never invented.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    external_id = models.CharField(max_length=255, unique=True)
    source = models.CharField(max_length=50, default="remotive")
    title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    apply_url = models.URLField()
    salary_range = models.CharField(max_length=255, blank=True)
    # Tags/skills extracted from the listing (lowercase-normalised)
    required_skills = models.JSONField(default=list)
    min_years = models.IntegerField(default=0)
    max_years = models.IntegerField(default=99)
    fetched_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["source", "external_id"])]


class JobMatch(models.Model):
    class MatchStatus(models.TextChoices):
        NEW = "new"
        SAVED = "saved"
        APPLIED = "applied"
        DISMISSED = "dismissed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="job_matches")
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name="job_matches")
    # Reference back to the source listing (nullable for legacy rows)
    posting = models.ForeignKey(JobPosting, on_delete=models.SET_NULL, null=True, blank=True)
    job_title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    external_url = models.URLField(blank=True)
    salary_range = models.CharField(max_length=255, blank=True)
    # Deterministic scoring fields — computed by compute_match_score, never random
    overall_score = models.IntegerField(default=0)
    matched_skills = models.JSONField(default=list)
    missing_skills = models.JSONField(default=list)
    experience_fit_pct = models.IntegerField(default=0)
    # Kept for backward compatibility with the serializer alias
    fit_score = models.FloatField(default=0.0)
    fit_explanation = models.TextField(blank=True)
    match_status = models.CharField(max_length=20, choices=MatchStatus.choices, default=MatchStatus.NEW)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-overall_score", "-created_at"]
