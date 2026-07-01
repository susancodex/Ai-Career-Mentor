"""
Deterministic job match scoring.

Same inputs ALWAYS produce the same output — no randomness, no AI call.
The formula is intentionally simple and explainable to users:
  - 70 % weight on skill overlap
  - 30 % weight on experience fit
Both components decay gracefully rather than clipping to zero at the boundary.
"""


def compute_match_score(
    user_skills: set[str],
    job_required_skills: set[str],
    user_years: int,
    job_min_years: int,
    job_max_years: int,
) -> dict:
    """
    Returns a dict with:
      overall_score       int   0-100
      matched_skills      list  skills the user already has
      missing_skills      list  skills the user still needs
      experience_fit_pct  int   0-100
    """
    if job_required_skills:
        overlap = user_skills & job_required_skills
        skill_overlap_pct = len(overlap) / len(job_required_skills)
    else:
        # No listed requirements → can't score skill fit; treat neutrally
        overlap = set()
        skill_overlap_pct = 0.5

    if job_min_years <= user_years <= job_max_years:
        experience_fit = 1.0
    elif user_years < job_min_years:
        # Under-qualified: 15 % penalty per missing year, floor 0
        experience_fit = max(0.0, 1.0 - (job_min_years - user_years) * 0.15)
    else:
        # Over-qualified: 5 % penalty per excess year, floor 0
        experience_fit = max(0.0, 1.0 - (user_years - job_max_years) * 0.05)

    overall_score = round((skill_overlap_pct * 0.7 + experience_fit * 0.3) * 100)

    return {
        "overall_score": overall_score,
        "matched_skills": sorted(overlap),
        "missing_skills": sorted(job_required_skills - user_skills),
        "experience_fit_pct": round(experience_fit * 100),
    }
