import logging
from celery import shared_task
from core.ai_client import call_ai_service
from .models import InterviewSession, InterviewQuestion

logger = logging.getLogger(__name__)


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
        logger.info("Generated %d questions for session %s", len(questions), session_id)
    except Exception as exc:
        logger.exception("Interview question generation failed for session %s", session_id)
        raise self.retry(exc=exc)
