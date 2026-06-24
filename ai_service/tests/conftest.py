"""
pytest configuration for the AI service test suite.

Key rules:
  - NEVER hit the real Gemini API in the normal test suite.
    Mock get_llm() / invoke_with_backoff() at the module boundary.
  - NEVER hit the real Langfuse instance in tests.
    The langfuse_handler is stubbed out automatically via ENV vars.
  - A separate, manually-triggered suite (tests/golden/) is allowed
    to hit real Gemini for nightly regression — run it separately.
"""
import os
import pytest

# Ensure no real API calls happen in tests
os.environ.setdefault("GOOGLE_API_KEY", "test-key-do-not-call-real-api")
os.environ.setdefault("AI_SERVICE_SHARED_SECRET", "dev-shared-secret-change-in-prod")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")
os.environ.setdefault("LANGFUSE_PUBLIC_KEY", "")
os.environ.setdefault("LANGFUSE_SECRET_KEY", "")
os.environ.setdefault("GEMINI_RPM_LIMIT", "60")  # Set high in tests to avoid throttling delays
