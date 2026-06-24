from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import verify_internal_signature
from app.agents.resume_agent import run_resume_agent
from app.schemas.resume import ResumeAnalyzeRequest, ResumeAnalysisResult

router = APIRouter(prefix="/resume", tags=["resume"])


@router.post(
    "/analyze",
    response_model=ResumeAnalysisResult,
    dependencies=[Depends(verify_internal_signature)],
)
async def analyze_resume(request: Request, body: ResumeAnalyzeRequest):
    """
    Analyse raw resume text and return structured result + 768-dim embedding.
    Called internally (HMAC-signed) by the Django Celery task.
    """
    try:
        result = await run_resume_agent(
            raw_text=body.raw_text,
            resume_id=body.resume_id,
            session_id=body.resume_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
