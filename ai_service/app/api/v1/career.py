from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import verify_internal_signature
from app.agents.career_agent import run_skill_gap_agent, run_career_path_agent
from app.schemas.career import (
    SkillGapRequest, SkillGapResult,
    CareerPathRequest, CareerPathResult,
)

router = APIRouter(prefix="/career", tags=["career"])


@router.post(
    "/skill-gaps",
    response_model=SkillGapResult,
    dependencies=[Depends(verify_internal_signature)],
)
async def skill_gaps(request: Request, body: SkillGapRequest):
    """Analyse skill gaps between resume and target role."""
    try:
        # STUB: resume_skills are fetched here by resume_id in production.
        # For now the caller must pass skills via the resume analysis result.
        # This is an open task: look up ResumeAnalysis by resume_id from DB.
        result = await run_skill_gap_agent(
            resume_skills=[],  # STUB — wire up DB lookup
            target_role=body.target_role,
            session_id=body.resume_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post(
    "/paths",
    response_model=CareerPathResult,
    dependencies=[Depends(verify_internal_signature)],
)
async def career_paths(request: Request, body: CareerPathRequest):
    """Generate ranked career paths toward a target role."""
    try:
        result = await run_career_path_agent(
            resume_summary="",  # STUB — wire up DB lookup for resume summary
            skills=[],           # STUB — wire up DB lookup for resume skills
            target_role=body.target_role,
            session_id=body.resume_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
