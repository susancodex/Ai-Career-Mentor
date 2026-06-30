from rest_framework import serializers
from .models import Resume, ResumeAnalysis


class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = (
            "id", "cloudinary_url", "cloudinary_public_id", "original_filename",
            "file_type", "status", "error_message", "created_at", "updated_at",
        )
        read_only_fields = ("id", "status", "file_type", "error_message", "created_at", "updated_at")


class ResumeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = ("cloudinary_url", "cloudinary_public_id", "original_filename")

    def validate_original_filename(self, value):
        ext = value.rsplit(".", 1)[-1].lower() if "." in value else ""
        if ext not in ("pdf", "docx", "doc"):
            raise serializers.ValidationError("Only PDF and DOCX files are supported.")
        return value


class ResumeAnalysisSerializer(serializers.ModelSerializer):
    resume_id = serializers.UUIDField(source="resume_id")
    extracted_skills = serializers.JSONField(source="skills")
    extracted_experience = serializers.JSONField(source="experience")

    class Meta:
        model = ResumeAnalysis
        fields = ("id", "resume_id", "extracted_skills", "extracted_experience", "summary", "created_at")
