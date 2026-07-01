"""
Celery tasks for resume processing.

Flow:
1. Task is enqueued immediately when a Resume is POSTed.
2. Task fetches raw bytes from the Cloudinary URL server-side.
3. Text is extracted (pdfplumber / python-docx) and saved to resume.raw_text.
4. A signed call is made to the AI service /resume/analyze endpoint.
5. Structured result is persisted into ResumeAnalysis.

The AI service call is HMAC-signed — see core.ai_client for details.
"""
import logging

import httpx
from celery import shared_task

from core.ai_client import call_ai_service
from .models import Resume, ResumeAnalysis

logger = logging.getLogger(__name__)


def _content_type_from_filename(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    mapping = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "doc": "application/msword",
    }
    return mapping.get(ext, f"application/{ext}")


def _extract_text_from_bytes(content: bytes, filename: str) -> str:
    import io
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "pdf":
        import pdfplumber
        text_chunks = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_chunks.append(page_text)
        return "\n".join(text_chunks)

    if ext in ("docx", "doc"):
        from docx import Document
        doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())

    logger.warning("Unsupported file extension for text extraction: %s", ext)
    return ""


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def analyze_resume(self, resume_id: str):
    try:
        resume = Resume.objects.get(pk=resume_id)
    except Resume.DoesNotExist:
        logger.error("Resume not found: %s", resume_id)
        return

    resume.status = Resume.Status.PARSING
    resume.save(update_fields=["status", "updated_at"])

    try:
        # Fetch raw bytes from Cloudinary URL server-side
        with httpx.Client(timeout=30.0) as client:
            response = client.get(resume.cloudinary_url)
            response.raise_for_status()
            content = response.content

        ext = resume.original_filename.rsplit(".", 1)[-1].lower() if "." in resume.original_filename else ""
        resume.file_type = ext
        raw_text = _extract_text_from_bytes(content, resume.original_filename)
        resume.raw_text = raw_text
        resume.save(update_fields=["file_type", "raw_text", "updated_at"])

        # Guard: near-empty text means extraction failed (e.g. scanned image PDF).
        # Do NOT retry — the file content is the problem, not a transient error.
        if len(raw_text.strip()) < 50:
            resume.status = Resume.Status.FAILED
            resume.error_message = (
                "Could not extract readable text from this file. "
                "It may be a scanned image — please upload a text-based PDF or DOCX "
                "(one where you can select and copy the text)."
            )
            resume.save(update_fields=["status", "error_message", "updated_at"])
            logger.warning(
                "Resume %s has near-empty extracted text (%d chars) — marking failed without retry",
                resume_id, len(raw_text.strip()),
            )
            return

        # Call AI service (HMAC-signed)
        result = call_ai_service(
            "POST",
            "/api/v1/resume/analyze",
            payload={"resume_id": str(resume_id), "raw_text": raw_text},
        )

        # Persist — tied to this exact resume, queryable later, stable on refresh
        ResumeAnalysis.objects.update_or_create(
            resume=resume,
            defaults={
                "extracted_skills": result.get("extracted_skills", []),
                "years_of_experience": result.get("years_of_experience", 0),
                "work_history": result.get("work_history", []),
                "strengths": result.get("strengths", []),
                "gaps": result.get("gaps", []),
                "ats_issues": result.get("ats_issues", []),
                "overall_score": result.get("overall_score", 0),
                "raw_extracted_text": raw_text,
                "embedding": result.get("embedding"),
            },
        )

        resume.status = Resume.Status.PARSED
        resume.save(update_fields=["status", "updated_at"])
        logger.info("Resume analyzed successfully: %s", resume_id)

    except Exception as exc:
        logger.exception("Resume analysis failed for %s", resume_id)
        resume.status = Resume.Status.FAILED
        resume.error_message = str(exc)[:500]
        resume.save(update_fields=["status", "error_message", "updated_at"])
        raise self.retry(exc=exc)
