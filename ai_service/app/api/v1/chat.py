"""
Chat SSE endpoint.

The Django proxy view opens this endpoint and relays the stream to the browser.
Rate-limit events are streamed back as typed SSE events — never block indefinitely.

Multi-turn context: conversation history is loaded from the Django Postgres DB
(chat_chatmessage table) rather than relying on the in-memory LangGraph
checkpointer. This means conversation context survives AI service restarts.
"""
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.core.security import verify_internal_signature
from app.core.db import get_chat_history
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
    # Load prior messages so the LLM has multi-turn context.
    # Capped at 20 messages to stay within the model's context window budget.
    history = await get_chat_history(body.session_id, limit=20)

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
