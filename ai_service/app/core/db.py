"""
Shared async Postgres connection pool for the AI service.

The AI service reads ResumeAnalysis and ChatMessage rows that Django writes,
using the same Postgres instance. asyncpg is used directly (no ORM) because
this service only needs two read queries — SQLAlchemy would be overkill.

Pool lifecycle: init_pool() is called at FastAPI startup; close_pool() at
shutdown (see main.py). All query functions fail gracefully (log + empty
default) if called before the pool is ready, so startup ordering issues
don't cause hard crashes.

IMPORTANT: The DATABASE_URL env var uses the "postgresql+asyncpg://" format
(SQLAlchemy convention). asyncpg itself expects "postgresql://" — the "+"
prefix is stripped here.
"""
import json
import logging
from typing import Optional

import asyncpg

from app.core.config import settings

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None


def _asyncpg_dsn() -> str:
    """Strip the '+asyncpg' SQLAlchemy driver prefix for raw asyncpg use."""
    return settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")


async def init_pool() -> None:
    global _pool
    try:
        _pool = await asyncpg.create_pool(
            _asyncpg_dsn(),
            min_size=2,
            max_size=10,
            command_timeout=10,
        )
        logger.info("DB pool initialized (min=2 max=10)")
    except Exception:
        logger.exception(
            "Failed to initialize DB pool — resume/job/chat DB lookups will "
            "return empty defaults until the pool is available."
        )


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        logger.info("DB pool closed")
        _pool = None


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

_EMPTY_ANALYSIS = {
    "extracted_skills": [],
    "years_of_experience": 0,
    "work_history": [],
    "strengths": [],
    "gaps": [],
    "ats_issues": [],
    "overall_score": 0,
    "embedding": [],
}


async def get_resume_analysis(resume_id: str) -> dict:
    """
    Fetch the full ResumeAnalysis row for a given resume_id.

    Returns _EMPTY_ANALYSIS if:
      - The pool is not yet initialised (startup ordering).
      - No analysis row exists for this resume_id (analysis still running).
      - Any DB error (logged, never raised to the caller).

    JSON columns are stored as JSON text by Django's JSONField;
    asyncpg returns them as str — we parse those here.
    """
    if not _pool:
        logger.warning("DB pool not ready — returning empty resume analysis for %s", resume_id)
        return _EMPTY_ANALYSIS

    try:
        row = await _pool.fetchrow(
            """
            SELECT extracted_skills, years_of_experience, work_history,
                   strengths, gaps, ats_issues, overall_score, embedding
            FROM resumes_resumeanalysis
            WHERE resume_id = $1
            """,
            resume_id,
        )
    except Exception:
        logger.exception("DB error fetching resume analysis for %s", resume_id)
        return _EMPTY_ANALYSIS

    if not row:
        return _EMPTY_ANALYSIS

    def _parse_json(val):
        if isinstance(val, str):
            return json.loads(val)
        return val

    return {
        "extracted_skills": _parse_json(row["extracted_skills"]) or [],
        "years_of_experience": row["years_of_experience"] or 0,
        "work_history": _parse_json(row["work_history"]) or [],
        "strengths": _parse_json(row["strengths"]) or [],
        "gaps": _parse_json(row["gaps"]) or [],
        "ats_issues": _parse_json(row["ats_issues"]) or [],
        "overall_score": row["overall_score"] or 0,
        "embedding": _parse_json(row["embedding"]) or [],
    }


async def get_chat_history(session_id: str, limit: int = 20) -> list[dict]:
    """
    Return the most recent `limit` messages for a chat session, oldest-first.

    Each entry: {"role": "user"|"assistant", "content": "..."}.
    Returns [] on any error or if the pool is not ready.
    """
    if not _pool:
        logger.warning("DB pool not ready — returning empty chat history for session %s", session_id)
        return []

    try:
        rows = await _pool.fetch(
            """
            SELECT role, content
            FROM chat_chatmessage
            WHERE session_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            """,
            session_id,
            limit,
        )
    except Exception:
        logger.exception("DB error fetching chat history for session %s", session_id)
        return []

    # fetchrow returns newest-first; reverse to oldest-first for the prompt.
    return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]
