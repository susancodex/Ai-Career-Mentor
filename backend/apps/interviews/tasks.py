"""
Interview question generation task.

Key behaviours:
- Passes resume_id to the AI service so questions are anchored to the
  candidate's actual work history (not generic role questions).
- Passes years_experience for seniority calibration.
- Saves anchored_to on each InterviewQuestion so the frontend can show
  which resume item each question references.
- Deduplication: if the session already has questions (e.g. called twice),
  the existing questions are cleared and regenerated so the deck is always
  consistent with the current resume.
"""
import logging
from celery import shared_task
from core.ai_client import call_ai_service
from .models import InterviewSession, InterviewQuestion

logger = logging.getLogger(__name__)

GEMINI_ERROR_MESSAGES = {
    429: "AI service is busy. Your request is queued — results arrive in a few minutes.",
    503: "AI service temporarily unavailable. Retrying automatically.",
}


def _get_resume_context(session: InterviewSession) -> tuple[str | None, int]:
    """
    Return (resume_id_str, years_experience) for the session's linked resume.
    Falls back to (None, 0) if no resume is linked or analysis is unavailable.
    """
    if not session.resume_id:
        return None, 0
    try:
        from apps.resumes.models import ResumeAnalysis
        analysis = ResumeAnalysis.objects.filter(resume_id=session.resume_id).first()
        if analysis:
            return str(session.resume_id), analysis.years_of_experience or 0
        return str(session.resume_id), 0
    except Exception:
        logger.warning("Could not load ResumeAnalysis for resume_id=%s", session.resume_id)
        return str(session.resume_id), 0


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_interview_questions(self, session_id: str):
    try:
        session = InterviewSession.objects.get(pk=session_id)

        # Clear any existing questions so the deck is always coherent
        # with the current resume/role combination.
        existing = session.questions.count()
        if existing:
            session.questions.all().delete()
            logger.debug("Cleared %d existing questions for session %s", existing, session_id)

        resume_id, years_experience = _get_resume_context(session)

        result = call_ai_service(
            "POST",
            "/api/v1/interview/questions/generate",
            payload={
                "session_id": session_id,
                "target_role": session.target_role,
                "resume_id": resume_id,
                "years_experience": years_experience,
            },
        )
        questions = result.get("questions", [])
        for q in questions:
            InterviewQuestion.objects.create(
                session=session,
                question_text=q.get("question_text", ""),
                category=q.get("category", InterviewQuestion.Category.GENERAL),
                anchored_to=q.get("anchored_to") or "",
            )

        session.status = InterviewSession.Status.READY
        session.save(update_fields=["status"])
        logger.info(
            "Generated %d questions for session %s (resume_id=%s, years=%d, resume_specific=%d)",
            len(questions), session_id, resume_id, years_experience,
            sum(1 for q in questions if q.get("category") == "resume_specific"),
        )
    except Exception as exc:
        logger.exception("Interview question generation failed for session %s", session_id)
        status_code = getattr(exc, "response", getattr(exc, "__cause__", None))
        if hasattr(status_code, "status_code"):
            status_code = status_code.status_code
        else:
            status_code = None

        error_msg = GEMINI_ERROR_MESSAGES.get(status_code, "Processing failed. Try again.")

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
