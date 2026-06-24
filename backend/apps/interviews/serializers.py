from rest_framework import serializers
from .models import InterviewSession, InterviewQuestion


class InterviewQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewQuestion
        fields = ("id", "question_text", "category", "user_answer", "ai_feedback", "score", "created_at")


class InterviewSessionSerializer(serializers.ModelSerializer):
    questions = InterviewQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = InterviewSession
        fields = ("id", "target_role", "questions", "created_at")
