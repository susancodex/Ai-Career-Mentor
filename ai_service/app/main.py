"""
AI Career Mentor — FastAPI AI Service

Internal-only service. All routes require a valid HMAC signature from Django.
Never expose port 8001 to the public internet.

Observability: every Gemini call is traced via Langfuse (see core/langfuse_setup.py).
Rate limiting: centralised in core/gemini_client.py + tools/rate_limiter.py.
"""
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import resume, career, jobs, interview, learning, chat
from app.core.config import settings

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Career Mentor — AI Service",
    description="Internal FastAPI service: LangGraph agents powered by Gemini API.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS: no public origins — this service is only reachable from Django internally
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_methods=["POST"],
    allow_headers=["*"],
)

# Register routers
app.include_router(resume.router, prefix="/api/v1")
app.include_router(career.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(interview.router, prefix="/api/v1")
app.include_router(learning.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai_service"}


@app.on_event("startup")
async def startup():
    logger.info("AI service starting up. Default model: %s", settings.GEMINI_DEFAULT_MODEL)
    from app.core.db import init_pool
    await init_pool()
    if settings.SENTRY_DSN:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        sentry_sdk.init(dsn=settings.SENTRY_DSN, integrations=[FastApiIntegration()])


@app.on_event("shutdown")
async def shutdown():
    from app.core.db import close_pool
    await close_pool()
    logger.info("AI service shut down cleanly.")
