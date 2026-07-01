import uuid
from django.db import models
from django.contrib.auth import get_user_model
from apps.resumes.models import Resume

User = get_user_model()


class CareerPath(models.Model):
    """
    Persists the full AI career-path result per (user, resume, target_role).

    unique_together ensures the same combination is never silently regenerated —
    a second request returns the stored result rather than re-invoking the AI.
    Explicit regeneration requires deleting the row first (or force_regenerate).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="career_paths")
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name="career_paths")
    target_role = models.CharField(max_length=255, blank=True)
    # Full AI response stored as-is: list-of-lists of CareerStep dicts
    paths_json = models.JSONField(default=list)
    recommended_path_index = models.IntegerField(default=0)
    summary = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = [["user", "resume", "target_role"]]


class SkillGap(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="skill_gaps")
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name="skill_gaps")
    target_role = models.CharField(max_length=255)
    missing_skills = models.JSONField(default=list)
    existing_skills = models.JSONField(default=list)
    skill_levels = models.JSONField(default=dict)
    analysis = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
