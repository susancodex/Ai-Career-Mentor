"""
Chat views.

SSE event format contract (must match frontend chat.ts):
  - token event:   data: {"token": "<chunk>"}\n\n
  - terminal:      data: [DONE]\n\n

The AI service emits {type, content} events internally; this relay
transforms them to the {token} / [DONE] shape the frontend expects.

API contract:
  POST /chat/sessions/                  -> 201 ChatSession
  GET  /chat/sessions/{id}/messages/   -> 200 ChatMessage[]
  POST /chat/sessions/{id}/messages/   -> text/event-stream
"""
import json
import logging
from datetime import datetime

import httpx
from django.conf import settings
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import BaseRenderer, JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView


class EventStreamRenderer(BaseRenderer):
    """Passthrough renderer so DRF content negotiation accepts Accept: text/event-stream."""
    media_type = "text/event-stream"
    format = "event-stream"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data

from core.ai_client import _headers
from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer

logger = logging.getLogger(__name__)


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

        response = StreamingHttpResponse(
            self._stream_from_ai(session, content),
            content_type="text/event-stream",
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response

    def _stream_from_ai(self, session: ChatSession, content: str):
        """
        Relays AI service SSE to browser using the frontend's expected format:
          {type: "token", content: "X"}  →  data: {"token": "X"}\n\n
          {type: "done"}                 →  data: [DONE]\n\n
          {type: "rate_limited"|"error"} →  data: {"token": "<message>"}\n\n  then  data: [DONE]\n\n
        """
        ai_url = f"{settings.AI_SERVICE_URL}/api/v1/chat/message"
        payload = json.dumps({
            "session_id": str(session.id),
            "user_id": str(session.user_id),
            "content": content,
        }).encode()
        headers = _headers("POST", "/api/v1/chat/message", payload)
        headers["Accept"] = "text/event-stream"

        assistant_chunks: list[str] = []

        try:
            with httpx.Client(timeout=httpx.Timeout(120.0, connect=5.0)) as client:
                with client.stream("POST", ai_url, content=payload, headers=headers) as resp:
                    resp.raise_for_status()
                    for line in resp.iter_lines():
                        if not line.startswith("data:"):
                            continue
                        data_str = line[5:].strip()
                        try:
                            data = json.loads(data_str)
                        except json.JSONDecodeError:
                            continue

                        event_type = data.get("type")
                        event_content = data.get("content", "")

                        if event_type == "token":
                            assistant_chunks.append(event_content)
                            yield f'data: {json.dumps({"token": event_content})}\n\n'

                        elif event_type == "done":
                            yield "data: [DONE]\n\n"
                            return

                        elif event_type in ("rate_limited", "error"):
                            # Surface the message as a final token so the user sees it,
                            # then terminate cleanly.
                            if event_content:
                                assistant_chunks.append(event_content)
                                yield f'data: {json.dumps({"token": event_content})}\n\n'
                            yield "data: [DONE]\n\n"
                            return

        except httpx.HTTPError as e:
            logger.error("AI service streaming error: %s", e)
            msg = "AI service unavailable. Please try again."
            assistant_chunks.append(msg)
            yield f'data: {json.dumps({"token": msg})}\n\n'
            yield "data: [DONE]\n\n"
        finally:
            final_content = "".join(assistant_chunks)
            if final_content:
                ChatMessage.objects.create(
                    session=session,
                    role=ChatMessage.Role.ASSISTANT,
                    content=final_content,
                )
