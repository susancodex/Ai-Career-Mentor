"""
Shared Gemini LLM wrapper.

ALL agents must import get_llm() / invoke_with_backoff() / stream_with_backoff()
from here. No agent constructs its own ChatGoogleGenerativeAI instance directly.

This centralises:
  - Rate limiting (proactive token-bucket, below free-tier RPM)
  - Exponential backoff + jitter on 429s
  - Langfuse tracing (callback injected automatically)
  - Hard ceiling on retries → typed RateLimitedError (no silent hangs)

Free-tier design notes:
  - Flash (gemini-2.5-flash) is the default; use the fallback model
    (gemini-2.5-flash-lite) for cheap / high-throughput calls.
  - Never enable billing on the dev Google Cloud project — doing so removes
    the free tier rather than just adding overage charges.
"""
import logging
from typing import AsyncGenerator, Optional

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential_jitter,
)

from app.core.config import settings
from app.core.langfuse_setup import get_langfuse_handler
from app.tools.rate_limiter import gemini_limiter

logger = logging.getLogger(__name__)


class RateLimitedError(Exception):
    """Raised when the Gemini rate limiter is exhausted after all retries."""


def get_llm(
    model: Optional[str] = None,
    temperature: float = 0.3,
    session_id: Optional[str] = None,
    use_fallback: bool = False,
):
    """
    Return a ChatGoogleGenerativeAI instance with Langfuse tracing attached.

    Args:
        model: Override model name. Defaults to settings.GEMINI_DEFAULT_MODEL.
        temperature: Sampling temperature.
        session_id: Langfuse session_id for multi-turn trace linking.
        use_fallback: If True, use the lighter fallback model for cheap calls.
    """
    from langchain_google_genai import ChatGoogleGenerativeAI

    chosen_model = model or (
        settings.GEMINI_FALLBACK_MODEL if use_fallback else settings.GEMINI_DEFAULT_MODEL
    )
    callbacks = []
    handler = get_langfuse_handler(session_id=session_id)
    if handler:
        callbacks.append(handler)

    return ChatGoogleGenerativeAI(
        model=chosen_model,
        temperature=temperature,
        google_api_key=settings.GOOGLE_API_KEY,
        callbacks=callbacks if callbacks else None,
    )


def _is_rate_limit_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "429" in msg or "quota" in msg or "rate" in msg


@retry(
    wait=wait_exponential_jitter(initial=1, max=30),
    stop=stop_after_attempt(5),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def invoke_with_backoff(llm, messages: list) -> str:
    """
    Invoke the LLM with proactive rate limiting and exponential backoff.

    - Acquires a token from the bucket BEFORE the call (avoids hitting 429).
    - On 429-like errors, backs off and retries up to 5 times.
    - After 5 failures, raises RateLimitedError (never hangs indefinitely).

    The caller is responsible for catching RateLimitedError and surfacing
    an appropriate error to the user (e.g. SSE 'rate_limited' event for chat).
    """
    await gemini_limiter.acquire()
    try:
        response = await llm.ainvoke(messages)
        return response
    except Exception as exc:
        if _is_rate_limit_error(exc):
            logger.warning("Gemini rate limit hit: %s", exc)
            raise
        logger.error("Gemini invocation error: %s", exc)
        raise


async def stream_with_backoff(
    llm,
    messages: list,
) -> AsyncGenerator[str, None]:
    """
    Stream tokens from the LLM with proactive rate limiting.

    Acquires a token-bucket token before opening the stream so the proactive
    limiter fires before we touch the API — same contract as invoke_with_backoff.

    Yields individual text chunks as they arrive from the model.
    Raises RateLimitedError on quota errors (caller must handle and emit SSE).
    Raises the original exception on other failures (caller emits SSE error).

    Usage:
        async for chunk in stream_with_backoff(llm, messages):
            yield f'data: {json.dumps({"type": "token", "content": chunk})}\n\n'
    """
    await gemini_limiter.acquire()
    try:
        async for chunk in llm.astream(messages):
            if chunk.content:
                yield chunk.content
    except Exception as exc:
        if _is_rate_limit_error(exc):
            logger.warning("Gemini rate limit hit during streaming: %s", exc)
            raise RateLimitedError(str(exc)) from exc
        logger.error("Gemini streaming error: %s", exc)
        raise
