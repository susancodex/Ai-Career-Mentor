"""
Chat SSE endpoint.

The Django proxy view opens this endpoint and relays the stream to the browser.
Rate-limit events are streamed back as typed SSE events — never block indefinitely.
"""
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.core.security import verify_internal_signature
from app.agents.orchestrator import stream_chat
from app.schemas.chat import ChatMessageRequest

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post(
    "/message",
    response_class=StreamingResponse,
    dependencies=[Depends(verify_internal_signature)],
)
async def chat_message(request: Request, body: ChatMessageRequest):
    """
    Stream SSE tokens from the LangGraph orchestrator.

    Event types:
      {"type": "token",        "content": "..."}  — text chunk
      {"type": "done"}                             — stream closed normally
      {"type": "rate_limited", "content": "..."}  — Gemini quota exhausted
      {"type": "error",        "content": "..."}  — unexpected failure
    """
    # Fetch conversation history — STUB: look up from DB by session_id
    history: list = []  # open task: DB lookup of prior ChatMessage rows

    return StreamingResponse(
        stream_chat(
            session_id=body.session_id,
            user_id=body.user_id,
            content=body.content,
            history=history,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
