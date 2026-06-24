"""
HMAC-signed HTTP client for Django → AI service internal calls.

Every call includes:
  X-Signature: HMAC-SHA256(secret, method|path|timestamp|body_hash)
  X-Timestamp: Unix seconds (UTC)

The AI service rejects signatures older than 60 seconds (replay protection).
Never log or expose AI_SERVICE_SHARED_SECRET.
"""
import hashlib
import hmac
import json
import logging
import time
from typing import Any

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=5.0)


def _sign(method: str, path: str, timestamp: int, body_bytes: bytes) -> str:
    body_hash = hashlib.sha256(body_bytes).hexdigest()
    message = f"{method.upper()}|{path}|{timestamp}|{body_hash}"
    secret = settings.AI_SERVICE_SHARED_SECRET.encode()
    return hmac.new(secret, message.encode(), hashlib.sha256).hexdigest()


def _headers(method: str, path: str, body_bytes: bytes) -> dict:
    ts = int(time.time())
    sig = _sign(method, path, ts, body_bytes)
    return {
        "X-Signature": sig,
        "X-Timestamp": str(ts),
        "Content-Type": "application/json",
    }


def call_ai_service(method: str, path: str, payload: Any = None, timeout: float = 30.0) -> dict:
    """
    Make a signed synchronous HTTP call to the internal AI service.
    Raises httpx.HTTPError on transport failures.
    Raises ValueError if the AI service returns a non-2xx status.
    """
    base_url = settings.AI_SERVICE_URL.rstrip("/")
    url = f"{base_url}{path}"
    body_bytes = json.dumps(payload).encode() if payload is not None else b""

    headers = _headers(method, path, body_bytes)

    with httpx.Client(timeout=httpx.Timeout(timeout, connect=5.0)) as client:
        response = client.request(
            method=method,
            url=url,
            content=body_bytes,
            headers=headers,
        )

    if not response.is_success:
        logger.error(
            "AI service returned error",
            extra={"status": response.status_code, "path": path, "body": response.text[:500]},
        )
        raise ValueError(f"AI service error {response.status_code}: {response.text[:200]}")

    return response.json()
