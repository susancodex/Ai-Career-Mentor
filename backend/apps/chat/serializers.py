from rest_framework import serializers
from .models import ChatSession, ChatMessage


class ChatMessageSerializer(serializers.ModelSerializer):
    session_id = serializers.UUIDField(source="session_id")

    class Meta:
        model = ChatMessage
        fields = ("id", "session_id", "role", "content", "created_at")


class ChatSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatSession
        fields = ("id", "title", "created_at")
