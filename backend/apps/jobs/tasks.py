import logging
from celery import shared_task
from core.ai_client import call_ai_service
from apps.resumes.models import Resume
from .models import JobMatch

logger = logging.getLogger(__name__)


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
        raise self.retry(exc=exc)
