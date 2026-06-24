from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import verify_internal_signature
from app.agents.learning_agent import run_learning_agent
from app.schemas.learning import LearningRoadmapRequest, LearningRoadmapResult

router = APIRouter(prefix="/learning", tags=["learning"])


@router.post(
    "/roadmap",
    response_model=LearningRoadmapResult,
    dependencies=[Depends(verify_internal_signature)],
)
async def generate_roadmap(request: Request, body: LearningRoadmapRequest):
    try:
        result = await run_learning_agent(
            missing_skills=body.missing_skills,
            target_role=body.target_role,
            session_id=body.skill_gap_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
