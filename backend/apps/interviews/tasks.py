import logging
from celery import shared_task
from core.ai_client import call_ai_service
from .models import InterviewSession, InterviewQuestion

logger = logging.getLogger(__name__)

GEMINI_ERROR_MESSAGES = {
    429: "AI service is busy. Your request is queued — results arrive in a few minutes.",
    503: "AI service temporarily unavailable. Retrying automatically.",
}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_interview_questions(self, session_id: str):
    try:
        session = InterviewSession.objects.get(pk=session_id)
        result = call_ai_service(
            "POST",
            "/api/v1/interview/questions/generate",
            payload={"session_id": session_id, "target_role": session.target_role},
        )
        questions = result.get("questions", [])
        for q in questions:
            InterviewQuestion.objects.create(
                session=session,
                question_text=q.get("question_text", ""),
                category=q.get("category", InterviewQuestion.Category.GENERAL),
            )
        session.status = InterviewSession.Status.READY
        session.save(update_fields=["status"])
        logger.info("Generated %d questions for session %s", len(questions), session_id)
    except Exception as exc:
        logger.exception("Interview question generation failed for session %s", session_id)
        # Extract status code if available
        status_code = getattr(exc, "response", getattr(exc, "__cause__", None))
        if hasattr(status_code, "status_code"):
            status_code = status_code.status_code
        else:
            status_code = None
        
        # Get user-friendly error message
        error_msg = GEMINI_ERROR_MESSAGES.get(status_code, "Processing failed. Try again.")
        
        # Store error in AsyncJob if it exists
        from apps.jobs.models import AsyncJob
        try:
            job = AsyncJob.objects.filter(celery_task_id=self.request.id).first()
            if job:
                job.status = AsyncJob.Status.FAILED
                job.error_message = error_msg
                job.save(update_fields=["status", "error_message"])
        except Exception:
            pass
            
        raise self.retry(exc=exc)
