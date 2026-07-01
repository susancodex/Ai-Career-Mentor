"""
Job matching task.

Data source: Remotive API — free, no key required, returns real remote job
listings with company names, real apply URLs, and skill tags.
https://remotive.com/api/remote-jobs

Scoring: deterministic compute_match_score — same inputs always produce the
same score. No AI call, no randomness.

Personalisation:
  - Preferred roles from the user profile are used to keyword-filter the raw
    listing pool so different users see different top results.
  - Experience range is extracted from job title + description text so the
    experience_fit component of the score is actually meaningful (rather than
    always 0–99 which makes every job score 100% on experience fit).
"""
import logging
import re
from typing import Optional
import httpx
from celery import shared_task

from apps.resumes.models import Resume, ResumeAnalysis
from .matching import compute_match_score
from .models import JobMatch, JobPosting

logger = logging.getLogger(__name__)

REMOTIVE_API = "https://remotive.com/api/remote-jobs"
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

# Seniority-level → (min_years, max_years) heuristics applied to job titles
_SENIORITY_PATTERNS: list[tuple[re.Pattern, tuple[int, int]]] = [
    (re.compile(r"\b(principal|distinguished|fellow)\b", re.I), (10, 99)),
    (re.compile(r"\b(staff)\b", re.I), (8, 99)),
    (re.compile(r"\b(lead|architect|head of)\b", re.I), (6, 99)),
    (re.compile(r"\b(senior|sr\.?)\b", re.I), (4, 15)),
    (re.compile(r"\b(mid[- ]?level|mid)\b", re.I), (2, 6)),
    (re.compile(r"\b(junior|jr\.?|entry[- ]?level|associate|graduate)\b", re.I), (0, 3)),
    (re.compile(r"\b(intern(ship)?)\b", re.I), (0, 1)),
]

# Explicit "N+ years" / "N–M years" patterns extracted from description text
_EXPLICIT_YEARS_RE = re.compile(
    r"(\d+)\s*(?:–|-|to)\s*(\d+)\s*(?:\+)?\s*years?"  # "3-5 years" / "3–5 years"
    r"|(\d+)\s*\+\s*years?"                             # "5+ years"
    r"|(\d+)\s*years?\s+(?:of\s+)?experience",          # "5 years experience"
    re.I,
)


def _extract_experience_range(title: str, description: str) -> tuple[int, int]:
    """
    Return (min_years, max_years) by inspecting the job title and the first
    500 chars of the description.

    Priority:
      1. Explicit "N+ years" / "N–M years" clause in the description.
      2. Seniority keyword in the title.
      3. Fallback: (0, 99) — full range, no penalty either way.
    """
    # 1. Explicit years clause — search the first 500 chars of the description
    snippet = description[:500]
    for m in _EXPLICIT_YEARS_RE.finditer(snippet):
        lo_a, hi_a, lo_b, lo_c = m.group(1), m.group(2), m.group(3), m.group(4)
        if lo_a and hi_a:
            return int(lo_a), int(hi_a)
        if lo_b:
            return int(lo_b), 99
        if lo_c:
            return int(lo_c), 99

    # 2. Seniority keyword in the title
    for pattern, year_range in _SENIORITY_PATTERNS:
        if pattern.search(title):
            return year_range

    return 0, 99


def _listing_keyword_score(job: dict, keywords: list[str]) -> int:
    """
    Return the number of keywords that appear in the job title or tag list.
    Used to prioritise listings that match the user's preferred roles so that
    different users see different personalised pools.
    """
    if not keywords:
        return 0
    title = (job.get("title") or "").lower()
    tags = " ".join(t.lower() for t in (job.get("tags") or []))
    haystack = f"{title} {tags}"
    return sum(1 for kw in keywords if kw.lower() in haystack)


def _fetch_remotive_listings(keywords: list[str], limit: int = 100) -> list[dict]:
    """
    Fetch real job listings from Remotive.

    If the user supplied preferred-role keywords, listings whose title or tags
    contain at least one keyword are sorted to the top of the returned list so
    the scoring stage sees the most relevant candidates first.

    Falls back to an empty list on any network failure — the task logs the
    error and creates zero matches rather than raising and retrying with stale
    data.
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

    if keywords:
        # Stable sort: keyword-matching listings bubble to the top, others follow
        listings.sort(key=lambda j: _listing_keyword_score(j, keywords), reverse=True)
        logger.debug(
            "Keyword sort applied (%d keywords): top title=%s",
            len(keywords),
            listings[0].get("title") if listings else "—",
        )

    return listings


def _upsert_posting(job: dict) -> Optional[JobPosting]:
    """Normalise a Remotive listing and upsert it into JobPosting.

    Experience range is extracted from the job title and description rather
    than defaulting to 0–99, so compute_match_score can produce a meaningful
    experience_fit_pct for each listing.
    """
    try:
        tags = [t.lower().strip() for t in (job.get("tags") or []) if t.strip()]
        title = job.get("title", "")
        description = job.get("description", "")
        min_years, max_years = _extract_experience_range(title, description)

        posting, _ = JobPosting.objects.update_or_create(
            external_id=str(job["id"]),
            defaults={
                "source": "remotive",
                "title": title[:255],
                "company": job.get("company_name", "")[:255],
                "location": (job.get("candidate_required_location") or "Remote")[:255],
                "description": description[:10000],
                "apply_url": job.get("url", ""),
                "salary_range": (job.get("salary") or "")[:255],
                "required_skills": tags,
                "min_years": min_years,
                "max_years": max_years,
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
    2. Load preferred roles from the user's Profile to personalise the pool.
    3. Fetch fresh listings from Remotive (real companies, real apply URLs),
       sorted so keyword-matching listings are evaluated first.
    4. Extract experience ranges from listing text so scoring is meaningful.
    5. Score each listing deterministically — no AI, no randomness.
    6. Clear stale matches, persist only listings that exceed MIN_MATCH_SCORE.
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

        # Pull profile for preferred roles / location — used to personalise
        # the listing pool so different users see different top results
        preferred_keywords: list[str] = []
        try:
            from apps.users.models import Profile
            profile = Profile.objects.get(user_id=user_id)
            preferred_keywords = list(profile.preferred_roles or []) or list(profile.target_roles or [])
        except Exception:
            pass

        # Also include top skills as secondary keyword signals if no role prefs
        if not preferred_keywords and user_skills:
            preferred_keywords = sorted(user_skills)[:10]

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
            matched = len(score_data["matched_skills"])
            total_required = matched + len(score_data["missing_skills"])
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
                    f"Matched {matched} of {total_required} required skills "
                    f"({score_data['experience_fit_pct']}% experience fit)."
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
