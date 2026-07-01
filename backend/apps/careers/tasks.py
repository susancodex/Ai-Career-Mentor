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


class InsufficientDataError(ValueError):
    """Raised when a resume has no extractable skills — generating paths would
    produce invented content instead of a real plan.  Fail fast, no retry."""


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_career_paths(self, user_id: str, resume_id: str, target_role: str = "", job_id: Optional[str] = None):
    """
    1. Guards against empty skills — fails immediately with a user-facing message
       rather than letting the AI invent plausible-sounding content.
    2. Fetches current_role and location from the user's Profile so the AI can
       calibrate paths to this specific person, not a generic profile.
    3. Persists via update_or_create so the same (user, resume, target_role)
       always returns the stored row on subsequent requests.
    """
    try:
        resume = Resume.objects.get(pk=resume_id, user_id=user_id)

        # --- Pull all real data from stored rows; no extra AI calls ---
        existing_skills: list[str] = []
        years_experience: int = 0
        try:
            analysis = ResumeAnalysis.objects.get(resume_id=resume_id)
            existing_skills = analysis.extracted_skills or []
            years_experience = analysis.years_of_experience or 0
        except ResumeAnalysis.DoesNotExist:
            logger.warning("No ResumeAnalysis for resume %s", resume_id)

        # Hard guard: generating paths without real skills produces invented content.
        # Surface a clear user-facing error instead of proceeding with garbage input.
        if not existing_skills:
            raise InsufficientDataError(
                "Upload and parse a resume first — career paths require your "
                "actual current skills to generate a meaningful plan."
            )

        # Profile fields calibrate the AI to this specific person.
        current_role: Optional[str] = None
        location_preference: Optional[str] = None
        try:
            from apps.users.models import Profile
            profile = Profile.objects.get(user_id=user_id)
            current_role = profile.current_role or None
            location_preference = profile.location or None
        except Exception:
            logger.warning("Could not load profile for user %s — proceeding without location/role", user_id)

        # If current_role not on profile, fall back to most recent work history entry.
        if not current_role and years_experience:
            try:
                work_history = analysis.work_history or []
                if work_history:
                    current_role = work_history[0].get("title")
            except Exception:
                pass

        result = call_ai_service(
            "POST",
            "/api/v1/career/paths",
            payload={
                "resume_id": resume_id,
                "target_role": target_role,
                "existing_skills": existing_skills,
                "years_experience": years_experience,
                "current_role": current_role,
                "location_preference": location_preference,
            },
        )

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

    except InsufficientDataError as exc:
        # Not a transient error — do not retry. Surface message to the job record.
        logger.warning("Career path aborted for resume=%s: %s", resume_id, exc)
        from apps.jobs.models import AsyncJob
        try:
            job = AsyncJob.objects.filter(celery_task_id=self.request.id).first()
            if job:
                job.status = AsyncJob.Status.FAILED
                job.error_message = str(exc)
                job.save(update_fields=["status", "error_message"])
        except Exception:
            pass
        return  # no retry

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
