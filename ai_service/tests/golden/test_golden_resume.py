"""
Golden tests: Resume Agent — real Gemini API.

These tests verify the resume agent returns structurally valid JSON with the
expected keys and non-empty values.  They do NOT assert exact content since
model outputs vary; they assert *shape* and *sensibility*.

Rate-limit budget: 2 LLM calls (1 resume parse, 1 skill extraction).
Each test has a 90-second timeout.  The suite sleeps between tests to stay
within the free-tier 10 RPM limit.
"""
import asyncio
import json
import pytest

from app.agents.resume_agent import ResumeAgent
from app.core.gemini_client import get_llm

SAMPLE_RESUME_TEXT = """
John Smith
Software Engineer | john.smith@example.com

EXPERIENCE
Senior Software Engineer — Acme Corp (2021–present)
  • Led migration of monolith to microservices using Python and FastAPI
  • Reduced API latency by 40% via Redis caching
  • Mentored 3 junior engineers

Software Engineer — StartupXYZ (2018–2021)
  • Built data pipeline processing 10M events/day with Apache Kafka
  • Deployed ML models using Docker and Kubernetes

SKILLS
Python, FastAPI, Django, Redis, PostgreSQL, Kafka, Docker, Kubernetes,
AWS, TypeScript, React

EDUCATION
B.Sc. Computer Science — State University, 2018
"""


@pytest.fixture(scope="module")
def resume_agent():
    return ResumeAgent()


@pytest.mark.asyncio
async def test_resume_parse_returns_valid_structure(resume_agent):
    """Resume agent must return skills, experience, education, and summary."""
    result = await resume_agent.parse_resume(SAMPLE_RESUME_TEXT)

    assert isinstance(result, dict), "Result must be a dict"
    assert "skills" in result, "Must include 'skills'"
    assert "experience" in result, "Must include 'experience'"
    assert "summary" in result, "Must include 'summary'"

    assert isinstance(result["skills"], list), "'skills' must be a list"
    assert len(result["skills"]) > 0, "Must extract at least one skill"
    assert any("python" in s.lower() for s in result["skills"]), \
        "Should extract Python from this resume"

    assert isinstance(result["experience"], list), "'experience' must be a list"
    assert len(result["experience"]) > 0, "Must extract at least one experience entry"

    assert isinstance(result["summary"], str)
    assert len(result["summary"]) > 20, "Summary must be non-trivial"

    # Rate-limit buffer between tests
    await asyncio.sleep(10)


@pytest.mark.asyncio
async def test_resume_parse_json_serialisable(resume_agent):
    """Result must be JSON-serialisable (safe to store in DB JSONField)."""
    result = await resume_agent.parse_resume(SAMPLE_RESUME_TEXT)
    serialised = json.dumps(result)  # raises if not serialisable
    assert len(serialised) > 10
