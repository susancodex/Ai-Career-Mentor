"""
Test settings — inherits base, overrides DB to SQLite in-memory.

Why SQLite and not Postgres:
  The CI/Replit environment does not run Postgres. All Django model fields
  are standard types (JSONField for the embedding, not a pgvector column),
  so SQLite covers every Django test. Postgres-specific behaviour (pgvector
  cosine search) lives entirely in the AI service and is tested there.
"""
from .base import *  # noqa: F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Silence Celery in tests — tasks are mocked, not actually queued
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Use simple logging in tests
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "WARNING"},
}
