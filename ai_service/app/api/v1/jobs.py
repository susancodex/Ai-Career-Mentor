from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import verify_internal_signature
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
    STUB: resume embedding looked up by resume_id from DB; wired here as placeholder.
    """
    try:
        # STUB: look up resume embedding from DB by body.resume_id
        resume_embedding = []  # open task: DB lookup
        resume_summary = ""    # open task: DB lookup
        resume_skills = []     # open task: DB lookup

        if not resume_embedding:
            # No embedding available yet — return empty matches rather than error
            return JobMatchesResult(matches=[])

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
