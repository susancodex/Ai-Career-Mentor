"""
Unit tests for the token-bucket rate limiter.

These tests verify the limiter actually queues/backs off under burst load —
reading the code and assuming it works is not sufficient (per the build spec).
"""
import asyncio
import time
import pytest
from unittest.mock import patch


@pytest.mark.asyncio
async def test_limiter_allows_one_request_immediately():
    """A fresh limiter with a full bucket should allow the first call without waiting."""
    from app.tools.rate_limiter import TokenBucketLimiter
    limiter = TokenBucketLimiter(rpm=60, capacity=1)
    start = time.monotonic()
    await limiter.acquire()
    elapsed = time.monotonic() - start
    # Should be nearly instant (<0.1s)
    assert elapsed < 0.1


@pytest.mark.asyncio
async def test_limiter_throttles_burst():
    """
    N concurrent requests where N > capacity must complete but be serialised,
    not all return immediately. This proves the limiter actually throttles.
    """
    from app.tools.rate_limiter import TokenBucketLimiter
    rpm = 60  # 1 token/sec
    limiter = TokenBucketLimiter(rpm=rpm, capacity=1)

    n = 3
    start = time.monotonic()

    async def task():
        await limiter.acquire()

    await asyncio.gather(*[task() for _ in range(n)])
    elapsed = time.monotonic() - start

    # With rpm=60 (1 TPS) and 3 requests, the 2nd and 3rd must wait ~1s each.
    # Total elapsed should be ≥ (n-1) seconds.
    assert elapsed >= (n - 1) * 0.9, f"Expected ≥{n - 1}s elapsed, got {elapsed:.2f}s"


@pytest.mark.asyncio
async def test_limiter_refills_over_time():
    """After exhausting a token, waiting long enough should allow another."""
    from app.tools.rate_limiter import TokenBucketLimiter
    limiter = TokenBucketLimiter(rpm=60, capacity=1)  # 1 token/sec

    await limiter.acquire()  # Exhaust the bucket

    await asyncio.sleep(1.1)  # Wait for refill

    start = time.monotonic()
    await limiter.acquire()
    elapsed = time.monotonic() - start
    assert elapsed < 0.1, "After refill period, acquire should be fast"
