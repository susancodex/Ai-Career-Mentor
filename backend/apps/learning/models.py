import uuid
from django.db import models
from django.contrib.auth import get_user_model
from apps.careers.models import SkillGap

User = get_user_model()


class LearningRoadmap(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="roadmaps")
    skill_gap = models.ForeignKey(SkillGap, on_delete=models.CASCADE, related_name="roadmaps")
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    estimated_hours = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class LearningResource(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    roadmap = models.ForeignKey(LearningRoadmap, on_delete=models.CASCADE, related_name="resources")
    title = models.CharField(max_length=255)
    url = models.URLField(blank=True)
    resource_type = models.CharField(max_length=100, blank=True)
    estimated_hours = models.FloatField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    skill_name = models.CharField(max_length=255, blank=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]
