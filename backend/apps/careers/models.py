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
    paths = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)


class SkillGap(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="skill_gaps")
    resume = models.ForeignKey(Resume, on_delete=models.CASCADE, related_name="skill_gaps")
    target_role = models.CharField(max_length=255)
    missing_skills = models.JSONField(default=list)
    existing_skills = models.JSONField(default=list)
    analysis = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
