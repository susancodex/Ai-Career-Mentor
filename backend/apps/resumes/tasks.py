"""
Celery tasks for resume processing.

Flow:
1. Task is enqueued immediately when a Resume is POSTed.
2. Task fetches raw bytes from the Cloudinary URL server-side.
3. Text is extracted (pypdf / python-docx) and saved to resume.raw_text.
4. A signed call is made to the AI service /resume/analyze endpoint.
5. Structured result (skills, experience, education, embedding) is persisted.

The AI service call is HMAC-signed — see core.ai_client for details.
"""
import logging
import os

import httpx
from celery import shared_task
from django.utils import timezone

from core.ai_client import call_ai_service
from .models import Resume, ResumeAnalysis

logger = logging.getLogger(__name__)


def _extract_text_from_bytes(content: bytes, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "pdf":
        import io
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if ext in ("docx", "doc"):
        import io
        from docx import Document
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)

    # Stub: unsupported format — caller is responsible for checking extension before upload
    logger.warning("Unsupported file extension for text extraction: %s", ext)
    return ""


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def analyze_resume(self, resume_id: str):
    try:
        resume = Resume.objects.get(pk=resume_id)
    except Resume.DoesNotExist:
        logger.error("Resume not found: %s", resume_id)
        return

    resume.status = Resume.Status.PARSING
    resume.save(update_fields=["status", "updated_at"])

    try:
        # Fetch raw bytes from Cloudinary URL (server-side fetch, not streaming to client)
        with httpx.Client(timeout=30.0) as client:
            response = client.get(resume.cloudinary_url)
            response.raise_for_status()
            content = response.content

        # Determine file type from original filename
        ext = resume.original_filename.rsplit(".", 1)[-1].lower() if "." in resume.original_filename else ""
        resume.file_type = ext
        raw_text = _extract_text_from_bytes(content, resume.original_filename)
        resume.raw_text = raw_text
        resume.save(update_fields=["file_type", "raw_text", "updated_at"])

        # Call AI service (HMAC-signed)
        result = call_ai_service(
            "POST",
            "/api/v1/resume/analyze",
            payload={"resume_id": str(resume_id), "raw_text": raw_text},
        )

        ResumeAnalysis.objects.update_or_create(
            resume=resume,
            defaults={
                "skills": result.get("skills", []),
                "experience": result.get("experience", []),
                "education": result.get("education", []),
                "summary": result.get("summary", ""),
                "embedding": result.get("embedding"),
            },
        )

        resume.status = Resume.Status.PARSED
        resume.save(update_fields=["status", "updated_at"])
        logger.info("Resume analyzed successfully: %s", resume_id)

    except Exception as exc:
        logger.exception("Resume analysis failed for %s", resume_id)
        resume.status = Resume.Status.FAILED
        resume.error_message = str(exc)[:500]  # Limit to 500 chars
        resume.save(update_fields=["status", "error_message", "updated_at"])
        raise self.retry(exc=exc)
