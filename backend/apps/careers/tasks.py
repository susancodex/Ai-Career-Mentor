import logging
from typing import Optional
from celery import shared_task
from core.ai_client import call_ai_service
from apps.resumes.models import Resume, ResumeAnalysis
from .models import CareerPath, SkillGap

logger = logging.getLogger(__name__)

GEMINI_ERROR_MESSAGES = {
    429: "AI service is busy. Your request is queued — results arrive in a few minutes.",
    503: "AI service temporarily unavailable. Retrying automatically.",
}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_career_paths(self, user_id: str, resume_id: str, target_role: str = "", job_id: Optional[str] = None):
    """
    1. Fetches existing_skills from the stored ResumeAnalysis (already computed by the
       resume parser — no extra AI call needed).
    2. Passes existing_skills to the AI so path steps never list skills the user
       already has as "to learn".
    3. Persists via update_or_create so re-running for the same (user, resume,
       target_role) returns the same stored result rather than regenerating.
    """
    try:
        resume = Resume.objects.get(pk=resume_id, user_id=user_id)

        # Pull existing_skills from the already-computed ResumeAnalysis — no extra
        # AI call. If the analysis row is missing the resume is not yet parsed,
        # which the view guards against, but we degrade gracefully here anyway.
        existing_skills: list[str] = []
        try:
            analysis = ResumeAnalysis.objects.get(resume_id=resume_id)
            existing_skills = analysis.extracted_skills or []
        except ResumeAnalysis.DoesNotExist:
            logger.warning("No ResumeAnalysis found for resume %s — sending empty existing_skills", resume_id)

        result = call_ai_service(
            "POST",
            "/api/v1/career/paths",
            payload={
                "resume_id": resume_id,
                "target_role": target_role,
                "existing_skills": existing_skills,
            },
        )

        # Persist the full structured result. unique_together(user, resume, target_role)
        # guarantees stability — the same combination always returns this row.
        CareerPath.objects.update_or_create(
            user_id=user_id,
            resume=resume,
            target_role=target_role,
            defaults={
                "paths_json": result.get("paths", []),
                "recommended_path_index": result.get("recommended_path_index", 0),
                "summary": result.get("summary", ""),
            },
        )
        logger.info(
            "Career paths persisted for resume=%s target_role=%r (%d path(s))",
            resume_id, target_role, len(result.get("paths", [])),
        )

    except Exception as exc:
        logger.exception("Career path generation failed for resume=%s", resume_id)
        status_code = None
        cause = getattr(exc, "response", getattr(exc, "__cause__", None))
        if hasattr(cause, "status_code"):
            status_code = cause.status_code
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


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_skill_gaps(self, user_id: str, resume_id: str, target_role: str):
    try:
        resume = Resume.objects.get(pk=resume_id, user_id=user_id)
        result = call_ai_service(
            "POST",
            "/api/v1/career/skill-gaps",
            payload={"resume_id": resume_id, "target_role": target_role},
        )
        SkillGap.objects.update_or_create(
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
        logger.info("Skill gaps persisted for resume=%s target_role=%r", resume_id, target_role)

    except Exception as exc:
        logger.exception("Skill gap generation failed for resume=%s", resume_id)
        status_code = None
        cause = getattr(exc, "response", getattr(exc, "__cause__", None))
        if hasattr(cause, "status_code"):
            status_code = cause.status_code
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
