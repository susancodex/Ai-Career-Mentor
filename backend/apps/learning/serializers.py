from rest_framework import serializers
from .models import LearningRoadmap, LearningResource


class LearningResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningResource
        fields = (
            "id", "title", "url", "resource_type", "estimated_hours",
            "order", "skill_name", "completed", "created_at",
        )


class LearningRoadmapSerializer(serializers.ModelSerializer):
    resources = LearningResourceSerializer(many=True, read_only=True)

    class Meta:
        model = LearningRoadmap
        fields = ("id", "skill_gap", "title", "resources", "created_at")
