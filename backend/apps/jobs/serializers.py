from rest_framework import serializers
from .models import JobMatch, AsyncJob


class JobMatchSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="job_title")
    status = serializers.CharField(source="match_status")
    job_url = serializers.URLField(source="external_url")

    class Meta:
        model = JobMatch
        fields = (
            "id", "title", "company", "location",
            "overall_score", "matched_skills", "missing_skills", "experience_fit_pct",
            "salary_range", "job_url", "fit_explanation",
            "status", "created_at",
        )
        read_only_fields = (
            "id", "title", "company", "location",
            "overall_score", "matched_skills", "missing_skills", "experience_fit_pct",
            "salary_range", "job_url", "fit_explanation",
            "created_at",
        )


class AsyncJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = AsyncJob
        fields = ("id", "status", "result")
