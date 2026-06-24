from rest_framework import serializers
from .models import JobMatch, AsyncJob


class JobMatchSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="job_title")
    status = serializers.CharField(source="match_status")
    match_reasoning = serializers.CharField(source="fit_explanation")
    job_url = serializers.URLField(source="external_url")

    class Meta:
        model = JobMatch
        fields = (
            "id", "title", "company", "location",
            "fit_score", "match_reasoning", "salary_range", "job_url",
            "status", "created_at",
        )
        read_only_fields = (
            "id", "title", "company", "location",
            "fit_score", "match_reasoning", "salary_range", "job_url",
            "created_at",
        )


class AsyncJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = AsyncJob
        fields = ("id", "status", "result")
