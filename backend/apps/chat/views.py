"""
Chat views.

SSE event format contract (must match frontend chat.ts):
  - token event:   data: {"token": "<chunk>"}\n\n
  - terminal:      data: [DONE]\n\n

The Celery task stream_chat_message calls the AI service and relays tokens
through Redis pub/sub; this view forwards them to the browser.

API contract:
  POST /chat/sessions/                  -> 201 ChatSession
  GET  /chat/sessions/{id}/messages/   -> 200 ChatMessage[]
  POST /chat/sessions/{id}/messages/   -> text/event-stream
"""
import logging
from datetime import datetime

import redis
from django.conf import settings
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import BaseRenderer, JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer
from .tasks import stream_chat_message

logger = logging.getLogger(__name__)


class EventStreamRenderer(BaseRenderer):
    """Passthrough renderer so DRF content negotiation accepts Accept: text/event-stream."""
    media_type = "text/event-stream"
    format = "event-stream"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


class ChatSessionCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        title = f"Chat {datetime.utcnow().strftime('%b %d, %H:%M')}"
        session = ChatSession.objects.create(user=request.user, title=title)
        return Response(ChatSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class ChatMessagesDispatchView(APIView):
    """GET → message list, POST → SSE stream."""
    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer, EventStreamRenderer]

    def get(self, request, pk):
        try:
            session = ChatSession.objects.get(pk=pk, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": "Chat session not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )
        messages = session.messages.all()
        return Response(ChatMessageSerializer(messages, many=True).data)

    def post(self, request, pk):
        try:
            session = ChatSession.objects.get(pk=pk, user=request.user)
        except ChatSession.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": "Chat session not found.", "details": {}}},
                status=status.HTTP_404_NOT_FOUND,
            )

        content = request.data.get("content", "").strip()
        if not content:
            return Response(
                {"error": {"code": "bad_request", "message": "content is required.", "details": {}}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ChatMessage.objects.create(session=session, role=ChatMessage.Role.USER, content=content)

        channel = f"chat:stream:{session.id}"
        response = StreamingHttpResponse(
            self._relay_from_redis(channel, session, content),
            content_type="text/event-stream",
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response

    def _relay_from_redis(self, channel: str, session: ChatSession, content: str):
        """Subscribe to Redis pub/sub, then enqueue the Celery task that calls the AI service."""
        r = redis.from_url(settings.REDIS_URL)
        pubsub = r.pubsub()
        pubsub.subscribe(channel)

        try:
            stream_chat_message.delay(
                str(session.id),
                content,
                str(session.user.pk),  # type: ignore[attr-defined]
            )

            for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                data = message["data"]
                if isinstance(data, bytes):
                    data = data.decode()
                yield f"{data}\n\n"
                if data == "data: [DONE]":
                    break
        except Exception:
            logger.exception("Redis relay error for chat session %s", session.id)
            yield 'data: {"token": "Chat service unavailable. Please try again."}\n\n'
            yield "data: [DONE]\n\n"
        finally:
            pubsub.unsubscribe(channel)
            pubsub.close()
