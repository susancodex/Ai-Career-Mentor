"""
Unit tests for the Resume Agent.

The LLM is mocked at the LangChain boundary — these tests prove the
plumbing works (the mock is called, the result is parsed), not that
Gemini produces good output on real resumes.
"""
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


MOCK_RESPONSE = json.dumps({
    "skills": ["Python", "Django", "FastAPI"],
    "experience": [
        {
            "title": "Backend Engineer",
            "company": "TechCorp",
            "start_date": "2021-01",
            "end_date": "2024-01",
            "description": "Built REST APIs",
            "technologies": ["Python", "Django"]
        }
    ],
    "education": [
        {
            "degree": "BSc Computer Science",
            "institution": "MIT",
            "year": "2020",
            "field_of_study": "Computer Science"
        }
    ],
    "summary": "Experienced backend engineer.",
})


@pytest.mark.asyncio
async def test_resume_agent_parses_valid_llm_response():
    """Agent parses valid LLM JSON into a ResumeAnalysisResult."""
    mock_llm_response = MagicMock()
    mock_llm_response.content = MOCK_RESPONSE

    with (
        patch("app.agents.resume_agent.get_llm") as mock_get_llm,
        patch("app.agents.resume_agent.invoke_with_backoff", new_callable=AsyncMock) as mock_invoke,
        patch("app.agents.resume_agent.embed_text", new_callable=AsyncMock) as mock_embed,
    ):
        mock_embed.return_value = [0.0] * 768
        mock_invoke.return_value = mock_llm_response
        mock_get_llm.return_value = MagicMock()

        from app.agents.resume_agent import run_resume_agent
        result = await run_resume_agent(
            raw_text="John Doe\nBackend Engineer at TechCorp\nPython, Django",
            resume_id="test-resume-id",
        )

    assert result.skills == ["Python", "Django", "FastAPI"]
    assert len(result.experience) == 1
    assert result.experience[0].title == "Backend Engineer"
    assert len(result.embedding) == 768
    # Verify the LLM was actually called (proves plumbing, not output quality)
    mock_invoke.assert_called_once()


@pytest.mark.asyncio
async def test_resume_agent_retries_on_schema_mismatch():
    """Agent retries once with a repair prompt on schema mismatch."""
    bad_response = MagicMock()
    bad_response.content = "not valid json at all"

    good_response = MagicMock()
    good_response.content = MOCK_RESPONSE

    with (
        patch("app.agents.resume_agent.get_llm") as mock_get_llm,
        patch("app.agents.resume_agent.invoke_with_backoff", new_callable=AsyncMock) as mock_invoke,
        patch("app.agents.resume_agent.embed_text", new_callable=AsyncMock) as mock_embed,
    ):
        mock_embed.return_value = [0.0] * 768
        mock_invoke.side_effect = [bad_response, good_response]
        mock_get_llm.return_value = MagicMock()

        from app.agents.resume_agent import run_resume_agent
        result = await run_resume_agent(
            raw_text="Some resume text",
            resume_id="test-repair-id",
        )

    assert result.skills == ["Python", "Django", "FastAPI"]
    assert mock_invoke.call_count == 2  # Initial call + repair


@pytest.mark.asyncio
async def test_resume_agent_raises_after_repair_failure():
    """Agent raises ValueError after both initial and repair attempts fail."""
    bad_response = MagicMock()
    bad_response.content = "still not json"

    with (
        patch("app.agents.resume_agent.get_llm") as mock_get_llm,
        patch("app.agents.resume_agent.invoke_with_backoff", new_callable=AsyncMock) as mock_invoke,
        patch("app.agents.resume_agent.embed_text", new_callable=AsyncMock) as mock_embed,
    ):
        mock_embed.return_value = [0.0] * 768
        mock_invoke.return_value = bad_response
        mock_get_llm.return_value = MagicMock()

        from app.agents.resume_agent import run_resume_agent
        with pytest.raises(ValueError, match="valid output"):
            await run_resume_agent(raw_text="text", resume_id="failing-id")
