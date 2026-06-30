import logging
import httpx
from celery import shared_task
from core.ai_client import call_ai_service
from apps.resumes.models import Resume
from .models import JobMatch

logger = logging.getLogger(__name__)

GEMINI_ERROR_MESSAGES = {
    429: "AI service is busy. Your request is queued — results arrive in a few minutes.",
    503: "AI service temporarily unavailable. Retrying automatically.",
}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_job_matches(self, user_id: str, resume_id: str):
    try:
        resume = Resume.objects.get(pk=resume_id, user_id=user_id)
        result = call_ai_service(
            "POST",
            "/api/v1/jobs/matches",
            payload={"resume_id": resume_id},
        )
        matches = result.get("matches", [])
        for m in matches:
            JobMatch.objects.create(
                user_id=user_id,
                resume=resume,
                job_title=m.get("job_title", ""),
                company=m.get("company", ""),
                location=m.get("location", ""),
                description=m.get("description", ""),
                fit_score=m.get("fit_score", 0.0),
                fit_explanation=m.get("fit_explanation", ""),
                external_url=m.get("external_url", ""),
            )
        logger.info("Job matches generated for resume %s: %d matches", resume_id, len(matches))
    except Exception as exc:
        logger.exception("Job match generation failed")
        # Extract status code if available
        status_code = getattr(exc, "response", getattr(exc, "__cause__", None))
        if hasattr(status_code, "status_code"):
            status_code = status_code.status_code
        else:
            status_code = None
        
        # Get user-friendly error message
        error_msg = GEMINI_ERROR_MESSAGES.get(status_code, "Processing failed. Try again.")
        
        # Store error in AsyncJob if it exists
        from .models import AsyncJob
        try:
            job = AsyncJob.objects.filter(celery_task_id=self.request.id).first()
            if job:
                job.status = AsyncJob.Status.FAILED
                job.error_message = error_msg
                job.save(update_fields=["status", "error_message"])
        except Exception:
            pass
            
        raise self.retry(exc=exc)
