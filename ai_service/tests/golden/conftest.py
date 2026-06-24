"""
Golden test conftest — intentionally does NOT mock the Gemini API.

These tests hit the real free-tier Gemini endpoint.  They are excluded from
the default pytest run via --ignore=tests/golden in pytest.ini, and only
execute via the golden-tests.yml workflow (workflow_dispatch or nightly).

If GOOGLE_API_KEY is absent or looks like a CI dummy, every golden test is
skipped with a clear message rather than failing noisily.
"""
import os
import pytest

_DUMMY_KEY_PREFIXES = ("test-key", "ci-test", "do-not-call", "dummy")

_REAL_KEY = None


def _has_real_key() -> bool:
    key = os.environ.get("GOOGLE_API_KEY", "")
    return bool(key) and not any(key.startswith(p) for p in _DUMMY_KEY_PREFIXES)


@pytest.fixture(autouse=True)
def require_real_api_key():
    if not _has_real_key():
        pytest.skip(
            "GOOGLE_API_KEY is absent or a CI dummy — "
            "golden tests require a real key in the GOOGLE_API_KEY_GOLDEN secret."
        )
