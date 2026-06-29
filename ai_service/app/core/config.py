from pydantic import field_validator
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    GOOGLE_API_KEY: str
    GEMINI_DEFAULT_MODEL: str = "gemini-2.5-flash"
    GEMINI_FALLBACK_MODEL: str = "gemini-2.5-flash-lite"

    DATABASE_URL: str = "postgresql+asyncpg://career_mentor:devpassword@localhost:5432/career_mentor"
    REDIS_URL: str = "redis://localhost:6379/1"

    AI_SERVICE_SHARED_SECRET: str

    LANGFUSE_PUBLIC_KEY: Optional[str] = None
    LANGFUSE_SECRET_KEY: Optional[str] = None
    LANGFUSE_HOST: str = "http://localhost:3000"

    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

    SENTRY_DSN: Optional[str] = None
    LOG_LEVEL: str = "INFO"

    GEMINI_RPM_LIMIT: int = 8

    @field_validator("AI_SERVICE_SHARED_SECRET")
    @classmethod
    def secret_must_be_set(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError(
                "AI_SERVICE_SHARED_SECRET is not set. The AI service refuses to start "
                "without it — requests from Django would be unauthenticated."
            )
        return value

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
