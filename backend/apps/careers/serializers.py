from rest_framework import serializers
from .models import CareerPath, SkillGap


class CareerPathSerializer(serializers.ModelSerializer):
    resume_id = serializers.UUIDField(source="resume_id")

    class Meta:
        model = CareerPath
        fields = (
            "id", "resume_id", "target_role",
            "paths_json", "recommended_path_index", "summary",
            "created_at", "updated_at",
        )


class SkillGapSerializer(serializers.ModelSerializer):
    current_skills = serializers.JSONField(source="existing_skills")
    resume_id = serializers.UUIDField(source="resume_id")

    class Meta:
        model = SkillGap
        fields = (
            "id", "resume_id", "target_role",
            "current_skills", "missing_skills", "skill_levels", "analysis", "created_at",
        )
