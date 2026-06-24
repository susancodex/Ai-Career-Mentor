import logging
from celery import shared_task
from core.ai_client import call_ai_service
from apps.resumes.models import Resume
from .models import CareerPath, SkillGap

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_career_paths(self, user_id: str, resume_id: str, target_role: str = "", job_id: str = None):
    try:
        resume = Resume.objects.get(pk=resume_id, user_id=user_id)
        result = call_ai_service(
            "POST",
            "/api/v1/career/paths",
            payload={"resume_id": resume_id, "target_role": target_role},
        )
        CareerPath.objects.create(
            user_id=user_id,
            resume=resume,
            target_role=target_role,
            paths=result.get("paths", []),
        )
        logger.info("Career paths generated for resume %s", resume_id)
    except Exception as exc:
        logger.exception("Career path generation failed")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_skill_gaps(self, user_id: str, resume_id: str, target_role: str):
    try:
        resume = Resume.objects.get(pk=resume_id, user_id=user_id)
        result = call_ai_service(
            "POST",
            "/api/v1/career/skill-gaps",
            payload={"resume_id": resume_id, "target_role": target_role},
        )
        obj, _ = SkillGap.objects.update_or_create(
            user_id=user_id,
            resume=resume,
            target_role=target_role,
            defaults={
                "missing_skills": result.get("missing_skills", []),
                "existing_skills": result.get("existing_skills", []),
                "analysis": result.get("analysis", ""),
            },
        )
        logger.info("Skill gaps generated for resume %s target %s", resume_id, target_role)
    except Exception as exc:
        logger.exception("Skill gap generation failed")
        raise self.retry(exc=exc)
