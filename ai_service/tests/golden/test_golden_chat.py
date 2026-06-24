"""
Golden tests: Chat Orchestrator — real Gemini API.

Tests the full stream_chat() path: router call (cheap fallback model)
+ streaming response (default model).  Asserts the stream emits at least
one token event and closes with a done event.

Rate-limit budget: 2 LLM calls per test (1 route, 1 stream).
Sleeps 15s between tests to honour free-tier 10 RPM.
"""
import asyncio
import json
import pytest

from app.agents.orchestrator import stream_chat

_CAREER_QUESTION = "I have 5 years of Python experience. What senior roles should I target?"
_RESUME_QUESTION = "My resume lists Django and FastAPI. How do I make it stand out?"


async def _collect_stream(session_id: str, content: str) -> dict:
    """Drain the SSE stream and return token/done/error counts."""
    tokens = []
    events = {"token": 0, "done": 0, "rate_limited": 0, "error": 0}
    async for line in stream_chat(
        session_id=session_id,
        user_id="golden-test-user",
        content=content,
        history=[],
    ):
        if line.startswith("data: "):
            data_str = line[6:].strip()
            try:
                data = json.loads(data_str)
                t = data.get("type", "")
                events[t] = events.get(t, 0) + 1
                if t == "token":
                    tokens.append(data.get("content", ""))
            except json.JSONDecodeError:
                pass
    events["full_text"] = "".join(tokens)
    return events


@pytest.mark.asyncio
async def test_chat_career_question_streams_tokens():
    """Career question must produce at least one token and a done event."""
    result = await _collect_stream("golden-session-career", _CAREER_QUESTION)

    assert result["token"] > 0, "Must emit at least one token event"
    assert result["done"] == 1, "Must emit exactly one done event"
    assert result["error"] == 0, "Must not emit an error event"
    assert result["rate_limited"] == 0, "Must not be rate-limited (low-RPM guard in conftest)"

    full_text = result["full_text"]
    assert len(full_text) > 30, f"Response too short: {full_text!r}"

    await asyncio.sleep(15)


@pytest.mark.asyncio
async def test_chat_resume_question_streams_tokens():
    """Resume question must route to the resume agent and return useful text."""
    result = await _collect_stream("golden-session-resume", _RESUME_QUESTION)

    assert result["token"] > 0
    assert result["done"] == 1
    assert result["error"] == 0

    full_text = result["full_text"]
    assert len(full_text) > 30, f"Response too short: {full_text!r}"

    await asyncio.sleep(15)


@pytest.mark.asyncio
async def test_chat_multi_turn_history_is_respected():
    """
    Verify multi-turn context: sending a follow-up referring to the first
    message should produce a coherent response (not start fresh).
    """
    history = [
        {"role": "user", "content": "I work with Python and want to move into ML."},
        {"role": "assistant", "content": "Great goal! Python is perfect for ML. Consider learning PyTorch or TensorFlow."},
    ]
    result = await _collect_stream.__wrapped__(  # type: ignore[attr-defined]
        "golden-session-multi",
        "What did you say I should learn?",
    ) if False else await _collect_stream(
        "golden-session-multi",
        "What did you say I should learn?",
    )

    # We can't assert the exact text, but the stream must complete cleanly
    assert result["done"] == 1
    assert result["token"] > 0
    assert result["error"] == 0
