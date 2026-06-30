import logging
from celery import shared_task
from core.ai_client import call_ai_service
from apps.careers.models import SkillGap
from .models import LearningRoadmap, LearningResource

logger = logging.getLogger(__name__)

GEMINI_ERROR_MESSAGES = {
    429: "AI service is busy. Your request is queued — results arrive in a few minutes.",
    503: "AI service temporarily unavailable. Retrying automatically.",
}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_roadmap(self, user_id: str, skill_gap_id: str):
    try:
        skill_gap = SkillGap.objects.get(pk=skill_gap_id, user_id=user_id)
        result = call_ai_service(
            "POST",
            "/api/v1/learning/roadmap",
            payload={
                "skill_gap_id": skill_gap_id,
                "missing_skills": skill_gap.missing_skills,
                "target_role": skill_gap.target_role,
            },
        )
        roadmap = LearningRoadmap.objects.create(
            user_id=user_id,
            skill_gap=skill_gap,
            title=result.get("title", f"Roadmap for {skill_gap.target_role}"),
            description=result.get("description", ""),
            estimated_hours=result.get("estimated_hours"),
        )
        for i, r in enumerate(result.get("resources", [])):
            LearningResource.objects.create(
                roadmap=roadmap,
                title=r.get("title", ""),
                url=r.get("url", ""),
                resource_type=r.get("resource_type", ""),
                estimated_hours=r.get("estimated_hours"),
                order=r.get("order", i),
                skill_name=r.get("skill_name", ""),
            )
        logger.info("Roadmap generated for skill_gap %s", skill_gap_id)
    except Exception as exc:
        logger.exception("Roadmap generation failed for skill_gap %s", skill_gap_id)
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
