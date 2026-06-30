import uuid
from django.db import models
from django.contrib.auth import get_user_model
from apps.resumes.models import Resume

User = get_user_model()


class CareerPath(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="career_paths")
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name="career_paths")
    target_role = models.CharField(max_length=255, blank=True)
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    reasoning = models.TextField(blank=True)
    match_score = models.FloatField(default=0.0)
    required_skills = models.JSONField(default=list)
    timeline_months = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-match_score", "-created_at"]
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
