from rest_framework import serializers
from .models import InterviewSession, InterviewQuestion


class InterviewQuestionSerializer(serializers.ModelSerializer):
    question = serializers.CharField(source="question_text")
    session_id = serializers.UUIDField(source="session_id")

    class Meta:
        model = InterviewQuestion
        fields = (
            "id", "session_id", "category", "question", "anchored_to",
            "user_answer", "ai_feedback", "score", "strengths", "improvements",
            "created_at",
        )


class InterviewSessionSerializer(serializers.ModelSerializer):
    questions = InterviewQuestionSerializer(many=True, read_only=True)
    resume_id = serializers.UUIDField(source="resume_id", read_only=True, allow_null=True)

    class Meta:
        model = InterviewSession
        fields = ("id", "target_role", "resume_id", "status", "questions", "created_at")
