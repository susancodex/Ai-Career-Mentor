"""
Unit tests for the async DB helper (core/db.py).

The asyncpg pool is mocked at the boundary — these tests verify:
  - get_resume_analysis returns correct fields from a DB row
  - get_resume_analysis returns empty defaults when no row exists
  - get_resume_analysis returns empty defaults when pool is not ready
  - get_chat_history returns messages oldest-first
  - get_chat_history returns [] when pool is not ready or no rows exist
  - JSON-encoded columns (skills, embedding) are parsed correctly
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_pool_with_row(row_dict):
    """Return a mock asyncpg pool whose fetchrow returns the given dict."""
    pool = MagicMock()
    pool.fetchrow = AsyncMock(return_value=row_dict)
    pool.fetch = AsyncMock(return_value=[])
    return pool


def _make_pool_no_row():
    pool = MagicMock()
    pool.fetchrow = AsyncMock(return_value=None)
    pool.fetch = AsyncMock(return_value=[])
    return pool


# ---------------------------------------------------------------------------
# get_resume_analysis
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_resume_analysis_returns_correct_fields():
    """Parses skills/summary/embedding from a valid DB row."""
    import app.core.db as db_module

    row = {
        "extracted_skills": ["Python", "Django"],
        "years_of_experience": 3,
        "work_history": [{"company": "TechCorp", "title": "Developer"}],
        "strengths": ["Fast learner"],
        "gaps": ["No Java"],
        "ats_issues": ["PDF version"],
        "overall_score": 80,
        "embedding": [0.1] * 768,
    }
    pool = _make_pool_with_row(row)

    with patch.object(db_module, "_pool", pool):
        result = await db_module.get_resume_analysis("some-resume-id")

    assert result["extracted_skills"] == ["Python", "Django"]
    assert result["years_of_experience"] == 3
    assert len(result["embedding"]) == 768
    pool.fetchrow.assert_called_once()


@pytest.mark.asyncio
async def test_get_resume_analysis_json_string_columns():
    """Columns stored as JSON strings are parsed into Python objects."""
    import app.core.db as db_module

    row = {
        "extracted_skills": json.dumps(["TypeScript", "React"]),
        "years_of_experience": 2,
        "work_history": json.dumps([]),
        "strengths": json.dumps([]),
        "gaps": json.dumps([]),
        "ats_issues": json.dumps([]),
        "overall_score": 75,
        "embedding": json.dumps([0.5] * 768),
    }
    pool = _make_pool_with_row(row)

    with patch.object(db_module, "_pool", pool):
        result = await db_module.get_resume_analysis("json-str-id")

    assert result["extracted_skills"] == ["TypeScript", "React"]
    assert len(result["embedding"]) == 768


@pytest.mark.asyncio
async def test_get_resume_analysis_missing_row_returns_empty():
    """Returns empty defaults when no analysis row exists yet."""
    import app.core.db as db_module

    pool = _make_pool_no_row()
    with patch.object(db_module, "_pool", pool):
        result = await db_module.get_resume_analysis("missing-id")

    assert result == db_module._EMPTY_ANALYSIS


@pytest.mark.asyncio
async def test_get_resume_analysis_no_pool_returns_empty():
    """Returns empty defaults gracefully when pool is not initialised."""
    import app.core.db as db_module

    with patch.object(db_module, "_pool", None):
        result = await db_module.get_resume_analysis("no-pool-id")

    assert result == db_module._EMPTY_ANALYSIS


@pytest.mark.asyncio
async def test_get_resume_analysis_db_error_returns_empty():
    """Returns empty defaults and logs on any DB error; never raises."""
    import app.core.db as db_module

    pool = MagicMock()
    pool.fetchrow = AsyncMock(side_effect=Exception("connection refused"))

    with patch.object(db_module, "_pool", pool):
        result = await db_module.get_resume_analysis("err-id")

    assert result == db_module._EMPTY_ANALYSIS



# ---------------------------------------------------------------------------
# get_chat_history
# ---------------------------------------------------------------------------

def _make_record(role: str, content: str):
    rec = MagicMock()
    rec.__getitem__ = lambda self, key: {"role": role, "content": content}[key]
    return rec


@pytest.mark.asyncio
async def test_get_chat_history_returns_oldest_first():
    """Rows returned newest-first from DB are reversed to oldest-first."""
    import app.core.db as db_module

    # Simulate DB returning newest-first (ORDER BY created_at DESC)
    rows = [
        _make_record("assistant", "You are welcome!"),  # newest
        _make_record("user", "Thank you"),
        _make_record("assistant", "Python is great for backends."),
        _make_record("user", "Tell me about Python"),  # oldest
    ]
    pool = MagicMock()
    pool.fetch = AsyncMock(return_value=rows)

    with patch.object(db_module, "_pool", pool):
        result = await db_module.get_chat_history("sess-id", limit=20)

    assert len(result) == 4
    # After reversing, oldest should be first
    assert result[0]["role"] == "user"
    assert result[0]["content"] == "Tell me about Python"
    assert result[-1]["content"] == "You are welcome!"


@pytest.mark.asyncio
async def test_get_chat_history_empty_session():
    """Returns [] when no messages exist for the session."""
    import app.core.db as db_module

    pool = MagicMock()
    pool.fetch = AsyncMock(return_value=[])

    with patch.object(db_module, "_pool", None):
        result = await db_module.get_chat_history("empty-sess")

    assert result == []


@pytest.mark.asyncio
async def test_get_chat_history_db_error_returns_empty():
    """Returns [] on DB error; never raises."""
    import app.core.db as db_module

    pool = MagicMock()
    pool.fetch = AsyncMock(side_effect=Exception("timeout"))

    with patch.object(db_module, "_pool", pool):
        result = await db_module.get_chat_history("err-sess")

    assert result == []
