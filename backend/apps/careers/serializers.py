from rest_framework import serializers
from .models import CareerPath, SkillGap


class CareerPathSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareerPath
        fields = ("id", "resume", "target_role", "paths", "created_at")


class SkillGapSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillGap
        fields = ("id", "resume", "target_role", "missing_skills", "existing_skills", "analysis", "created_at")
