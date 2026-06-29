"""
Celery task: stream chat from the AI service and relay tokens via Redis pub/sub.

Django SSE views subscribe to the Redis channel — they must not call the AI
service directly. HMAC signing uses core.ai_client._headers (same as async tasks).
"""
import json
import logging

import httpx
import redis
from celery import shared_task
from django.conf import settings

from core.ai_client import _headers
from .models import ChatMessage, ChatSession

logger = logging.getLogger(__name__)

_CHAT_STREAM_PATH = "/api/v1/chat/message"


def _publish_token(r: redis.Redis, channel: str, token: str) -> None:
    r.publish(channel, f'data: {json.dumps({"token": token})}')


def _publish_done(r: redis.Redis, channel: str) -> None:
    r.publish(channel, "data: [DONE]")


@shared_task(bind=True, max_retries=3, default_retry_delay=2)
def stream_chat_message(self, session_id: str, content: str, user_id: str):
    """
    Calls the AI service streaming endpoint and relays each SSE token to Redis
    so the Django SSE view can forward them to the browser.
    """
    channel = f"chat:stream:{session_id}"
    r = redis.from_url(settings.REDIS_URL)

    payload = json.dumps({
        "session_id": session_id,
        "user_id": user_id,
        "content": content,
    }).encode()
    headers = _headers("POST", _CHAT_STREAM_PATH, payload)
    headers["Accept"] = "text/event-stream"
    ai_url = f"{settings.AI_SERVICE_URL.rstrip('/')}{_CHAT_STREAM_PATH}"

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
                        _publish_token(r, channel, event_content)
                    elif event_type == "done":
                        _publish_done(r, channel)
                        break
                    elif event_type in ("rate_limited", "error"):
                        if event_content:
                            assistant_chunks.append(event_content)
                            _publish_token(r, channel, event_content)
                        _publish_done(r, channel)
                        break

    except httpx.HTTPError as exc:
        logger.error("AI service streaming error for session %s: %s", session_id, exc)
        msg = "AI service unavailable. Please try again."
        assistant_chunks.append(msg)
        _publish_token(r, channel, msg)
        _publish_done(r, channel)
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)

    finally:
        final_content = "".join(assistant_chunks)
        if final_content:
            try:
                session = ChatSession.objects.get(pk=session_id)
                ChatMessage.objects.create(
                    session=session,
                    role=ChatMessage.Role.ASSISTANT,
                    content=final_content,
                )
            except ChatSession.DoesNotExist:
                logger.error("Chat session not found when saving assistant reply: %s", session_id)
