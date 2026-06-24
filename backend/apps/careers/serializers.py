from rest_framework import serializers
from .models import CareerPath, SkillGap


class CareerPathSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareerPath
        fields = (
            "id", "title", "description", "reasoning",
            "match_score", "required_skills", "timeline_months", "created_at",
        )


class SkillGapSerializer(serializers.ModelSerializer):
    current_skills = serializers.JSONField(source="existing_skills")
    resume_id = serializers.UUIDField(source="resume_id")

    class Meta:
        model = SkillGap
        fields = (
            "id", "resume_id", "target_role",
            "current_skills", "missing_skills", "skill_levels", "created_at",
        )
