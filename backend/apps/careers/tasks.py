import logging
from typing import Optional
from celery import shared_task
from core.ai_client import call_ai_service
from apps.resumes.models import Resume
from .models import CareerPath, SkillGap

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_career_paths(self, user_id: str, resume_id: str, target_role: str = "", job_id: Optional[str] = None):
    """
    Calls AI service, then creates one CareerPath row per path returned.
    AI service returns: {"paths": [{title, description, reasoning, match_score,
                                    required_skills, timeline_months}, ...]}
    """
    try:
        resume = Resume.objects.get(pk=resume_id, user_id=user_id)
        result = call_ai_service(
            "POST",
            "/api/v1/career/paths",
            payload={"resume_id": resume_id, "target_role": target_role},
        )
        paths = result.get("paths", [])
        for p in paths:
            CareerPath.objects.create(
                user_id=user_id,
                resume=resume,
                target_role=target_role,
                title=p.get("title", ""),
                description=p.get("description", ""),
                reasoning=p.get("reasoning", ""),
                match_score=p.get("match_score", 0.0),
                required_skills=p.get("required_skills", []),
                timeline_months=p.get("timeline_months", 0),
            )
        logger.info("Career paths generated for resume %s: %d paths", resume_id, len(paths))
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
                "skill_levels": result.get("skill_levels", {}),
                "analysis": result.get("analysis", ""),
            },
        )
        logger.info("Skill gaps generated for resume %s target %s", resume_id, target_role)
    except Exception as exc:
        logger.exception("Skill gap generation failed")
        raise self.retry(exc=exc)
