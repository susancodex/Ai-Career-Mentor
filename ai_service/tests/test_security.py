"""
Unit tests for HMAC signature verification.

Verifies:
  - Valid signature passes
  - Missing headers rejected
  - Stale timestamp (>60s) rejected
  - Wrong signature rejected
  - Forged body (different content) rejected

These tests prove the replay-protection and forgery-detection work
beyond just "it returned 200 in my one test."
"""
import hashlib
import hmac
import json
import time
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch


def _make_signature(secret: str, method: str, path: str, timestamp: int, body: bytes) -> str:
    body_hash = hashlib.sha256(body).hexdigest()
    message = f"{method.upper()}|{path}|{timestamp}|{body_hash}"
    return hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()


@pytest.fixture
def test_app():
    from fastapi import FastAPI, Depends
    from fastapi.responses import JSONResponse
    from app.core.security import verify_internal_signature

    app = FastAPI()

    @app.post("/test-secured")
    async def secured(dep=Depends(verify_internal_signature)):
        return {"ok": True}

    return app


def test_valid_signature_passes(test_app):
    client = TestClient(test_app, raise_server_exceptions=False)
    secret = "dev-shared-secret-change-in-prod"
    path = "/test-secured"
    body = b'{"hello": "world"}'
    ts = int(time.time())
    sig = _make_signature(secret, "POST", path, ts, body)

    with patch("app.core.security.settings") as mock_settings:
        mock_settings.AI_SERVICE_SHARED_SECRET = secret
        resp = client.post(
            path,
            content=body,
            headers={"X-Timestamp": str(ts), "X-Signature": sig, "Content-Type": "application/json"},
        )
    assert resp.status_code == 200


def test_missing_headers_rejected(test_app):
    client = TestClient(test_app, raise_server_exceptions=False)
    resp = client.post("/test-secured", json={"hello": "world"})
    assert resp.status_code == 401


def test_stale_timestamp_rejected(test_app):
    client = TestClient(test_app, raise_server_exceptions=False)
    secret = "dev-shared-secret-change-in-prod"
    path = "/test-secured"
    body = b"{}"
    ts = int(time.time()) - 120  # 2 minutes ago
    sig = _make_signature(secret, "POST", path, ts, body)

    with patch("app.core.security.settings") as mock_settings:
        mock_settings.AI_SERVICE_SHARED_SECRET = secret
        resp = client.post(
            path,
            content=body,
            headers={"X-Timestamp": str(ts), "X-Signature": sig, "Content-Type": "application/json"},
        )
    assert resp.status_code == 401


def test_wrong_signature_rejected(test_app):
    client = TestClient(test_app, raise_server_exceptions=False)
    ts = int(time.time())
    resp = client.post(
        "/test-secured",
        json={},
        headers={"X-Timestamp": str(ts), "X-Signature": "forged-signature"},
    )
    assert resp.status_code == 401


def test_body_tamper_rejected(test_app):
    """Changing the body after signing should invalidate the signature."""
    client = TestClient(test_app, raise_server_exceptions=False)
    secret = "dev-shared-secret-change-in-prod"
    path = "/test-secured"
    original_body = b'{"data": "original"}'
    tampered_body = b'{"data": "tampered"}'
    ts = int(time.time())
    sig = _make_signature(secret, "POST", path, ts, original_body)

    with patch("app.core.security.settings") as mock_settings:
        mock_settings.AI_SERVICE_SHARED_SECRET = secret
        resp = client.post(
            path,
            content=tampered_body,
            headers={"X-Timestamp": str(ts), "X-Signature": sig, "Content-Type": "application/json"},
        )
    assert resp.status_code == 401
