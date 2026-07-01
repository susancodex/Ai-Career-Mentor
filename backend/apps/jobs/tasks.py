"""
Job matching task.

Data source: Remotive API — free, no key required, returns real remote job
listings with company names, real apply URLs, and skill tags.
https://remotive.com/api/remote-jobs

Scoring: deterministic compute_match_score — same inputs always produce the
same score. No AI call, no randomness.
"""
import logging
from typing import Optional
import httpx
from celery import shared_task

from apps.resumes.models import Resume, ResumeAnalysis
from .matching import compute_match_score
from .models import JobMatch, JobPosting

logger = logging.getLogger(__name__)

REMOTIVE_API = "https://remotive.com/api/remote-jobs"
# Categories that map reasonably well to tech/professional roles
REMOTIVE_CATEGORIES = [
    "software-dev",
    "data",
    "product",
    "design",
    "devops-sysadmin",
    "business",
    "marketing",
]
FETCH_TIMEOUT = 15  # seconds
MIN_MATCH_SCORE = 25  # below this threshold, listing is too irrelevant to show


def _fetch_remotive_listings(keywords: list[str], limit: int = 100) -> list[dict]:
    """
    Fetch real job listings from Remotive. Returns a normalised list of dicts.
    Falls back to an empty list on any network failure — the task logs the error
    and creates zero matches rather than raising and retrying with stale data.
    """
    listings: list[dict] = []
    seen_ids: set = set()

    for category in REMOTIVE_CATEGORIES:
        try:
            resp = httpx.get(
                REMOTIVE_API,
                params={"category": category, "limit": limit},
                timeout=FETCH_TIMEOUT,
                headers={"User-Agent": "AICareerMentor/1.0"},
            )
            resp.raise_for_status()
            for job in resp.json().get("jobs", []):
                if job["id"] in seen_ids:
                    continue
                seen_ids.add(job["id"])
                listings.append(job)
        except Exception as exc:
            logger.warning("Remotive fetch failed for category=%s: %s", category, exc)

    return listings


def _upsert_posting(job: dict) -> Optional[JobPosting]:
    """Normalise a Remotive listing and upsert it into JobPosting."""
    try:
        tags = [t.lower().strip() for t in (job.get("tags") or []) if t.strip()]
        posting, _ = JobPosting.objects.update_or_create(
            external_id=str(job["id"]),
            defaults={
                "source": "remotive",
                "title": job.get("title", "")[:255],
                "company": job.get("company_name", "")[:255],
                "location": (job.get("candidate_required_location") or "Remote")[:255],
                "description": job.get("description", "")[:10000],
                "apply_url": job.get("url", ""),
                "salary_range": (job.get("salary") or "")[:255],
                "required_skills": tags,
                "min_years": 0,
                "max_years": 99,
            },
        )
        return posting
    except Exception as exc:
        logger.warning("Failed to upsert posting id=%s: %s", job.get("id"), exc)
        return None


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def refresh_job_matches(self, user_id: str, resume_id: str):
    """
    1. Load user's real skills + experience from ResumeAnalysis.
    2. Fetch fresh listings from Remotive (real companies, real apply URLs).
    3. Score each listing deterministically — no AI, no randomness.
    4. Clear stale matches, persist only listings that exceed MIN_MATCH_SCORE.
    """
    try:
        resume = Resume.objects.get(pk=resume_id, user_id=user_id)

        try:
            analysis = ResumeAnalysis.objects.get(resume_id=resume_id)
        except ResumeAnalysis.DoesNotExist:
            logger.warning("No ResumeAnalysis for resume %s — aborting job match", resume_id)
            return

        user_skills = {s.lower() for s in (analysis.extracted_skills or [])}
        user_years = analysis.years_of_experience or 0

        if not user_skills:
            logger.warning(
                "resume %s has no extracted_skills — job match requires a parsed resume",
                resume_id,
            )
            return

        # Pull profile for preferred roles / location (optional, degrades gracefully)
        preferred_keywords: list[str] = []
        try:
            from apps.users.models import Profile
            profile = Profile.objects.get(user_id=user_id)
            preferred_keywords = list(profile.preferred_roles or []) or list(profile.target_roles or [])
        except Exception:
            pass

        raw_listings = _fetch_remotive_listings(keywords=preferred_keywords)
        if not raw_listings:
            logger.warning("No listings fetched from Remotive for user %s", user_id)
            return

        # Score all listings, keep those above the relevance threshold
        scored: list[tuple[int, JobPosting, dict]] = []
        for job in raw_listings:
            posting = _upsert_posting(job)
            if not posting:
                continue
            job_skills = {s.lower() for s in posting.required_skills}
            score_data = compute_match_score(
                user_skills=user_skills,
                job_required_skills=job_skills,
                user_years=user_years,
                job_min_years=posting.min_years,
                job_max_years=posting.max_years,
            )
            if score_data["overall_score"] >= MIN_MATCH_SCORE:
                scored.append((score_data["overall_score"], posting, score_data))

        # Sort descending by score, keep top 20
        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:20]

        # Atomically replace stale matches for this (user, resume) pair
        JobMatch.objects.filter(user_id=user_id, resume=resume).delete()

        for overall_score, posting, score_data in top:
            JobMatch.objects.create(
                user_id=user_id,
                resume=resume,
                posting=posting,
                job_title=posting.title,
                company=posting.company,
                location=posting.location,
                description=posting.description[:2000],
                external_url=posting.apply_url,
                salary_range=posting.salary_range,
                overall_score=overall_score,
                matched_skills=score_data["matched_skills"],
                missing_skills=score_data["missing_skills"],
                experience_fit_pct=score_data["experience_fit_pct"],
                fit_score=overall_score / 100,
                fit_explanation=(
                    f"Matched {len(score_data['matched_skills'])} of "
                    f"{len(score_data['matched_skills']) + len(score_data['missing_skills'])} "
                    f"required skills. Experience fit: {score_data['experience_fit_pct']}%."
                ),
            )

        logger.info(
            "Job matches refreshed for resume=%s: %d/%d listings above threshold",
            resume_id, len(top), len(scored),
        )

    except Exception as exc:
        logger.exception("refresh_job_matches failed for resume=%s", resume_id)
        from .models import AsyncJob
        try:
            job = AsyncJob.objects.filter(celery_task_id=self.request.id).first()
            if job:
                job.status = AsyncJob.Status.FAILED
                job.error_message = "Job matching failed. Try again."
                job.save(update_fields=["status", "error_message"])
        except Exception:
            pass
        raise self.retry(exc=exc)


# Keep the old name as an alias so existing queued tasks don't break
generate_job_matches = refresh_job_matches
