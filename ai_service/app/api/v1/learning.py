from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import verify_internal_signature
from app.graph.build import get_graph
from app.schemas.learning import LearningRoadmapRequest, LearningRoadmapResult

router = APIRouter(prefix="/learning", tags=["learning"])


@router.post(
    "/roadmap",
    response_model=LearningRoadmapResult,
    dependencies=[Depends(verify_internal_signature)],
)
async def generate_roadmap(request: Request, body: LearningRoadmapRequest):
    try:
        initial = {
            "user_id": body.skill_gap_id,
            "target_role": body.target_role,
            "requested_outputs": ["learning_roadmap"],
            "skill_gap": {"missing_skills": body.missing_skills},
            "errors": [],
        }
        final = await get_graph().ainvoke(initial)

        if final.get("errors"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"LangGraph execution failed: {', '.join(final['errors'])}",
            )

        roadmap = final.get("learning_roadmap") or {}
        return LearningRoadmapResult(**roadmap)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

