from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import verify_internal_signature
from app.core.db import get_resume_analysis
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
        analysis = await get_resume_analysis(body.resume_id)
        result = await run_skill_gap_agent(
            resume_skills=analysis["skills"],
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
        analysis = await get_resume_analysis(body.resume_id)
        result = await run_career_path_agent(
            resume_summary=analysis["summary"],
            skills=analysis["skills"],
            target_role=body.target_role,
            session_id=body.resume_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
