"""
Chat views.

The streaming proxy view opens an SSE connection to the AI service's
/api/v1/chat/message endpoint and relays each event to the browser,
then persists the final assistant message once the stream closes.

If the Gemini rate limiter is saturated, the AI service streams back a
typed 'rate_limited' SSE event instead of blocking — we relay it as-is.

API contract (must match frontend prompt exactly):
  GET  /chat/sessions/{id}/messages/  → 200 ChatMessage[]
  POST /chat/sessions/{id}/messages/  → text/event-stream
"""
import json
import logging

import httpx
from django.conf import settings
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.ai_client import _headers
from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatMessageSerializer

logger = logging.getLogger(__name__)


class ChatSessionCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session = ChatSession.objects.create(user=request.user)
        return Response(ChatSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class ChatMessagesDispatchView(APIView):
    """
    Dispatches GET → message list, POST → SSE stream.
    Both operations on /chat/sessions/{id}/messages/ per the API contract.
    """
    permission_classes = [IsAuthenticated]

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
        Opens SSE stream to the AI service and relays events to the browser.
        Persists the assembled assistant message once the stream closes.
        Rate-limited events are relayed as-is — never blocked.
        """
        ai_url = f"{settings.AI_SERVICE_URL}/api/v1/chat/message"
        payload = json.dumps({
            "session_id": str(session.id),
            "user_id": str(session.user_id),
            "content": content,
        }).encode()
        headers = _headers("POST", "/api/v1/chat/message", payload)
        headers["Accept"] = "text/event-stream"

        assistant_chunks = []

        try:
            with httpx.Client(timeout=httpx.Timeout(120.0, connect=5.0)) as client:
                with client.stream("POST", ai_url, content=payload, headers=headers) as resp:
                    resp.raise_for_status()
                    for line in resp.iter_lines():
                        if line.startswith("data:"):
                            data_str = line[5:].strip()
                            yield f"data: {data_str}\n\n"
                            try:
                                data = json.loads(data_str)
                                if data.get("type") == "token":
                                    assistant_chunks.append(data.get("content", ""))
                            except json.JSONDecodeError:
                                pass

        except httpx.HTTPError as e:
            logger.error("AI service streaming error: %s", e)
            yield f'data: {json.dumps({"type": "error", "content": "AI service unavailable."})}\n\n'
        finally:
            final_content = "".join(assistant_chunks)
            if final_content:
                ChatMessage.objects.create(
                    session=session,
                    role=ChatMessage.Role.ASSISTANT,
                    content=final_content,
                )
