from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    GOOGLE_API_KEY: str
    GEMINI_DEFAULT_MODEL: str = "gemini-2.5-flash"
    GEMINI_FALLBACK_MODEL: str = "gemini-2.5-flash-lite"

    DATABASE_URL: str = "postgresql+asyncpg://career_mentor:devpassword@localhost:5432/career_mentor"
    REDIS_URL: str = "redis://localhost:6379/1"

    AI_SERVICE_SHARED_SECRET: str = "dev-shared-secret-change-in-prod"

    LANGFUSE_PUBLIC_KEY: Optional[str] = None
    LANGFUSE_SECRET_KEY: Optional[str] = None
    LANGFUSE_HOST: str = "http://localhost:3000"

    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

    SENTRY_DSN: Optional[str] = None
    LOG_LEVEL: str = "INFO"

    # Token-bucket rate limiter: stay just under Gemini free-tier RPM (10 RPM conservative)
    GEMINI_RPM_LIMIT: int = 8

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
