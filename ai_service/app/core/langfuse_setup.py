"""
Langfuse tracing setup.

Every LangGraph/LangChain run passes the callback handler returned by
get_langfuse_handler() so agent-to-agent handoffs inside the orchestrator
are traced as a single linked session, not disconnected calls.

Tie the Langfuse trace_id to chat_session_id for multi-turn tracing:
    handler = get_langfuse_handler(session_id=chat_session_id)
    await graph.ainvoke(state, config={"callbacks": [handler]})

If LANGFUSE_PUBLIC_KEY is not set (local dev without Langfuse), the handler
is a no-op so agents still work — tracing is just skipped silently.
"""
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_langfuse_handler(session_id: Optional[str] = None):
    if not settings.LANGFUSE_PUBLIC_KEY or not settings.LANGFUSE_SECRET_KEY:
        logger.debug("Langfuse keys not configured — tracing disabled.")
        return None

    try:
        from langfuse.callback import CallbackHandler
        handler = CallbackHandler(
            public_key=settings.LANGFUSE_PUBLIC_KEY,
            secret_key=settings.LANGFUSE_SECRET_KEY,
            host=settings.LANGFUSE_HOST,
            session_id=session_id,
        )
        return handler
    except Exception as e:
        logger.warning("Failed to initialise Langfuse handler: %s", e)
        return None
