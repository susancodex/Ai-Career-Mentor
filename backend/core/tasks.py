"""
Safe Celery task dispatch helpers.

When Redis is unavailable (local dev without a running broker, Replit env),
calling .delay() / .apply_async() triggers Celery's internal reconnect loop
(20 retries × 1 s ≈ 20 s) before raising an exception.

These wrappers do a sub-second TCP probe to the broker host/port BEFORE
touching Celery. If the port is not open, they return False immediately so
the HTTP handler can still send its response without hanging.

In production (Docker Compose with Redis), the probe succeeds in < 1 ms and
the call path is identical to calling .delay() / .apply_async() directly.
"""
import logging
import socket
from urllib.parse import urlparse

from django.conf import settings

logger = logging.getLogger(__name__)

_PROBE_TIMEOUT = 0.5  # seconds — fast enough to not block a request


def _broker_reachable() -> bool:
    """
    Return True if the Celery broker TCP port answers within _PROBE_TIMEOUT.
    Uses the CELERY_BROKER_URL setting to derive host + port.
    Silently returns False on any error so callers always get a bool.
    """
    url = getattr(settings, "CELERY_BROKER_URL", "redis://localhost:6379/0")
    try:
        parsed = urlparse(url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 6379
        with socket.create_connection((host, port), timeout=_PROBE_TIMEOUT):
            return True
    except OSError:
        return False


def safe_delay(task, *args, **kwargs) -> bool:
    """
    Probe the broker, then call task.delay(*args).
    Returns True if enqueued, False if broker unreachable.
    """
    if not _broker_reachable():
        logger.warning(
            "Celery broker unreachable — task %s NOT enqueued (no Redis at %s)",
            task.name,
            getattr(settings, "CELERY_BROKER_URL", "?"),
        )
        return False
    try:
        task.delay(*args, **kwargs)
        return True
    except Exception as exc:
        logger.warning("Celery dispatch error for task %s: %s", task.name, exc)
        return False


def safe_apply_async(task, *, args=None, kwargs=None, task_id=None, **options) -> bool:
    """
    Probe the broker, then call task.apply_async(args, kwargs, task_id=task_id).
    Returns True if enqueued, False if broker unreachable.
    """
    if not _broker_reachable():
        logger.warning(
            "Celery broker unreachable — task %s (id=%s) NOT enqueued (no Redis at %s)",
            task.name,
            task_id,
            getattr(settings, "CELERY_BROKER_URL", "?"),
        )
        return False
    try:
        task.apply_async(args=args or [], kwargs=kwargs or {}, task_id=task_id, **options)
        return True
    except Exception as exc:
        logger.warning(
            "Celery dispatch error for task %s (id=%s): %s", task.name, task_id, exc
        )
        return False
