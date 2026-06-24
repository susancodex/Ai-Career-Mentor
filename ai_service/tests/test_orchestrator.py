"""
Unit tests for the chat orchestrator (agents/orchestrator.py).

The LLM is mocked at the gemini_client boundary — these tests verify:
  - Normal streaming yields token events followed by a done event
  - RateLimitedError from classification yields a rate_limited SSE event
  - RateLimitedError from streaming yields a rate_limited SSE event
  - Unexpected errors yield an error SSE event
  - Each chunk from stream_with_backoff becomes a separate token event
"""
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


async def _collect_sse(gen) -> list[dict]:
    """Drain an async generator and parse each SSE 'data: ...' line."""
    events = []
    async for raw in gen:
        for line in raw.splitlines():
            if line.startswith("data: "):
                events.append(json.loads(line[len("data: "):]))
    return events


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stream_chat_yields_tokens_then_done():
    """Normal flow: routing succeeds → tokens streamed → done event."""
    from app.core.gemini_client import RateLimitedError
    from app.agents.orchestrator import stream_chat

    async def _fake_stream(*args, **kwargs):
        for chunk in ["Hello ", "world", "!"]:
            yield chunk

    with (
        patch("app.agents.orchestrator._classify_message", new=AsyncMock(return_value="general")),
        patch("app.agents.orchestrator.stream_with_backoff", side_effect=_fake_stream),
        patch("app.agents.orchestrator.get_llm", return_value=MagicMock()),
    ):
        events = await _collect_sse(
            stream_chat("sess-1", "user-1", "Hello!", history=[])
        )

    token_events = [e for e in events if e["type"] == "token"]
    done_events = [e for e in events if e["type"] == "done"]

    assert len(token_events) == 3
    assert token_events[0]["content"] == "Hello "
    assert token_events[1]["content"] == "world"
    assert token_events[2]["content"] == "!"
    assert len(done_events) == 1


# ---------------------------------------------------------------------------
# Rate-limit handling
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stream_chat_rate_limited_during_classification():
    """RateLimitedError from router emits rate_limited SSE and stops."""
    from app.core.gemini_client import RateLimitedError
    from app.agents.orchestrator import stream_chat

    with patch(
        "app.agents.orchestrator._classify_message",
        new=AsyncMock(side_effect=RateLimitedError("quota")),
    ):
        events = await _collect_sse(
            stream_chat("sess-2", "user-2", "hi", history=[])
        )

    assert len(events) == 1
    assert events[0]["type"] == "rate_limited"


@pytest.mark.asyncio
async def test_stream_chat_rate_limited_during_streaming():
    """RateLimitedError from stream_with_backoff emits rate_limited SSE."""
    from app.core.gemini_client import RateLimitedError
    from app.agents.orchestrator import stream_chat

    async def _rate_limited(*args, **kwargs):
        raise RateLimitedError("quota hit mid-stream")
        yield  # make it an async generator

    with (
        patch("app.agents.orchestrator._classify_message", new=AsyncMock(return_value="general")),
        patch("app.agents.orchestrator.stream_with_backoff", side_effect=_rate_limited),
        patch("app.agents.orchestrator.get_llm", return_value=MagicMock()),
    ):
        events = await _collect_sse(
            stream_chat("sess-3", "user-3", "hi", history=[])
        )

    assert any(e["type"] == "rate_limited" for e in events)
    assert not any(e["type"] == "done" for e in events)


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stream_chat_unexpected_error_yields_error_event():
    """An unexpected exception yields an error SSE event, not a crash."""
    from app.agents.orchestrator import stream_chat

    async def _explode(*args, **kwargs):
        raise RuntimeError("unexpected boom")
        yield

    with (
        patch("app.agents.orchestrator._classify_message", new=AsyncMock(return_value="general")),
        patch("app.agents.orchestrator.stream_with_backoff", side_effect=_explode),
        patch("app.agents.orchestrator.get_llm", return_value=MagicMock()),
    ):
        events = await _collect_sse(
            stream_chat("sess-4", "user-4", "hi", history=[])
        )

    assert any(e["type"] == "error" for e in events)
    assert not any(e["type"] == "done" for e in events)


# ---------------------------------------------------------------------------
# History is forwarded
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stream_chat_passes_history_to_llm():
    """Conversation history is included in the message list sent to the LLM."""
    from app.agents.orchestrator import stream_chat, _build_lc_messages
    from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

    history = [
        {"role": "user", "content": "What skills should I learn?"},
        {"role": "assistant", "content": "Consider Python and cloud computing."},
    ]

    messages = _build_lc_messages(
        system_prompt="You are a career mentor.",
        history=history,
        user_content="Tell me more.",
    )

    # SystemMessage + 2 history messages + new HumanMessage
    assert len(messages) == 4
    assert isinstance(messages[0], SystemMessage)
    assert isinstance(messages[1], HumanMessage)
    assert isinstance(messages[2], AIMessage)
    assert isinstance(messages[3], HumanMessage)
    assert messages[3].content == "Tell me more."
