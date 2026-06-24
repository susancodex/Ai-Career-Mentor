from rest_framework import serializers
from .models import JobMatch, AsyncJob


class JobMatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobMatch
        fields = (
            "id", "resume", "job_title", "company", "location", "description",
            "fit_score", "fit_explanation", "external_url", "match_status",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "resume", "job_title", "company", "location", "description",
            "fit_score", "fit_explanation", "external_url", "created_at", "updated_at",
        )


class AsyncJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = AsyncJob
        fields = ("id", "status", "result")
