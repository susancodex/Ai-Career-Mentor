"""
Safe Celery task dispatch helpers.

When Redis is unavailable (local dev without a running broker, Replit env),
.delay() and .apply_async() raise kombu.exceptions.OperationalError and hang.
These wrappers catch broker errors so the HTTP response is still returned
and the failure is logged — the task just won't run until a worker is available.

In production (Docker Compose with Redis), these calls behave identically to
calling .delay() / .apply_async() directly.
"""
import logging

logger = logging.getLogger(__name__)


def safe_delay(task, *args, **kwargs) -> bool:
    """
    Call task.delay(*args) — returns True if enqueued, False if broker unavailable.
    """
    try:
        task.delay(*args, **kwargs)
        return True
    except Exception as exc:
        logger.warning(
            "Celery broker unavailable — task %s NOT enqueued: %s",
            task.name,
            exc,
        )
        return False


def safe_apply_async(task, *, args=None, kwargs=None, task_id=None, **options) -> bool:
    """
    Call task.apply_async(args, kwargs, task_id=task_id) — returns True if
    enqueued, False if broker unavailable.
    """
    try:
        task.apply_async(args=args or [], kwargs=kwargs or {}, task_id=task_id, **options)
        return True
    except Exception as exc:
        logger.warning(
            "Celery broker unavailable — task %s (id=%s) NOT enqueued: %s",
            task.name,
            task_id,
            exc,
        )
        return False
