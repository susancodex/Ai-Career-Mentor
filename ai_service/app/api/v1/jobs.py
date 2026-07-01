from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import verify_internal_signature
from app.core.db import get_resume_analysis
from app.agents.job_search_agent import run_job_search_agent
from app.schemas.jobs import JobMatchRequest, JobMatchesResult

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post(
    "/matches",
    response_model=JobMatchesResult,
    dependencies=[Depends(verify_internal_signature)],
)
async def job_matches(request: Request, body: JobMatchRequest):
    """
    Find job matches using pgvector similarity + Gemini fit scoring.

    Fetches the resume embedding and skills from DB.
    Returns an empty match list if the analysis is not yet complete
    (e.g. resume still being processed) rather than raising an error —
    the caller should poll resume status before triggering job matching.
    """
    try:
        analysis = await get_resume_analysis(body.resume_id)
        resume_embedding = analysis["embedding"]
        resume_skills = analysis["extracted_skills"]

        if not resume_embedding:
            # Analysis not complete yet — empty response, not an error.
            return JobMatchesResult(matches=[])

        # Build a brief summary from work_history for the job search agent
        work_history = analysis.get("work_history", [])
        resume_summary = ", ".join(
            f"{e.get('title', '')} at {e.get('company', '')}"
            for e in work_history[:3]
            if e.get("title") or e.get("company")
        )

        result = await run_job_search_agent(
            resume_embedding=resume_embedding,
            resume_summary=resume_summary,
            resume_skills=resume_skills,
            session_id=body.resume_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
