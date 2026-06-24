"""
HMAC signature verification for Django → AI service internal calls.

Verification algorithm:
  1. Extract X-Timestamp and X-Signature headers.
  2. Reject if abs(now - timestamp) > 60 seconds (replay protection).
  3. Compute HMAC-SHA256 over METHOD|PATH|TIMESTAMP|SHA256(body).
  4. Reject if computed signature does not match (timing-safe compare).

A forged or stale request is rejected with 401. This function must be
called on every authenticated internal route — do NOT skip it for any
route that processes resume text or triggers LLM calls.
"""
import hashlib
import hmac
import time
from fastapi import Request, HTTPException, status

from .config import settings

_MAX_AGE_SECONDS = 60


async def verify_internal_signature(request: Request) -> None:
    ts_header = request.headers.get("X-Timestamp")
    sig_header = request.headers.get("X-Signature")

    if not ts_header or not sig_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing internal auth headers.",
        )

    try:
        timestamp = int(ts_header)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid timestamp.")

    age = abs(int(time.time()) - timestamp)
    if age > _MAX_AGE_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Request expired (age={age}s, max={_MAX_AGE_SECONDS}s).",
        )

    body = await request.body()
    body_hash = hashlib.sha256(body).hexdigest()
    method = request.method.upper()
    path = request.url.path
    message = f"{method}|{path}|{timestamp}|{body_hash}"

    secret = settings.AI_SERVICE_SHARED_SECRET.encode()
    expected = hmac.new(secret, message.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected, sig_header):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature.",
        )
