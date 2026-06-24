"""
Token-bucket rate limiter for Gemini API calls.

Tuned to stay just under the free-tier RPM cap (default: 8 RPM, leaving
headroom below the documented ~10 RPM Flash limit).

Design:
  - Each call to acquire() waits until a token is available.
  - Tokens refill at rate = GEMINI_RPM_LIMIT per 60 seconds.
  - The bucket has capacity = 1 token (strict: no burst above RPM).
  - This is proactive throttling — we never intentionally send a request
    that would hit a 429; exponential backoff in gemini_client.py handles
    the cases where the actual limit differs from our assumption.

Unit test this with a simulated burst (see tests/test_rate_limiter.py):
  assert that N > RPM_LIMIT concurrent acquire() calls all complete but
  are serialised, not dropped.
"""
import asyncio
import time
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


class TokenBucketLimiter:
    """
    Async token-bucket limiter.

    capacity: maximum tokens in the bucket (burst size).
    refill_rate: tokens added per second.
    """

    def __init__(self, rpm: int, capacity: int = 1):
        self._rate = rpm / 60.0  # tokens per second
        self._capacity = capacity
        self._tokens = float(capacity)
        self._last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    def _refill(self):
        now = time.monotonic()
        elapsed = now - self._last_refill
        added = elapsed * self._rate
        self._tokens = min(self._capacity, self._tokens + added)
        self._last_refill = now

    async def acquire(self):
        """Wait until a token is available, then consume one."""
        while True:
            async with self._lock:
                self._refill()
                if self._tokens >= 1.0:
                    self._tokens -= 1.0
                    return
                wait_for = (1.0 - self._tokens) / self._rate

            logger.debug("Rate limiter throttling — waiting %.2fs", wait_for)
            await asyncio.sleep(wait_for)


# Singleton limiter — all agents share this to prevent any single agent
# from starving others of free-tier quota.
gemini_limiter = TokenBucketLimiter(rpm=settings.GEMINI_RPM_LIMIT)
