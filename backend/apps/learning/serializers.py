from rest_framework import serializers
from .models import LearningRoadmap, LearningResource


class LearningResourceSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="resource_type")
    order_index = serializers.IntegerField(source="order")
    roadmap_id = serializers.UUIDField(source="roadmap_id")

    class Meta:
        model = LearningResource
        fields = (
            "id", "roadmap_id", "title", "type", "url",
            "estimated_hours", "completed", "order_index", "skill_name", "created_at",
        )


class LearningRoadmapSerializer(serializers.ModelSerializer):
    resources = LearningResourceSerializer(many=True, read_only=True)
    skill_gap_id = serializers.UUIDField(source="skill_gap_id")

    class Meta:
        model = LearningRoadmap
        fields = (
            "id", "skill_gap_id", "title", "description",
            "estimated_hours", "resources", "created_at",
        )
