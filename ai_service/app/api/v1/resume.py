from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import verify_internal_signature
from app.graph.build import get_graph
from app.schemas.resume import ResumeAnalyzeRequest, ResumeAnalysisResult, WorkHistoryItem, EducationItem

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
        initial = {
            "user_id": body.resume_id,
            "resume_id": body.resume_id,
            "resume_text": body.raw_text,
            "requested_outputs": ["resume_profile"],
            "errors": [],
        }
        final = await get_graph().ainvoke(initial)

        if final.get("errors"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"LangGraph execution failed: {', '.join(final['errors'])}",
            )

        profile = final.get("resume_profile") or {}
        embedding = profile.get("embedding")

        return ResumeAnalysisResult(
            extracted_skills=profile.get("skills", []),
            years_of_experience=profile.get("years_experience", 0),
            work_history=[
                WorkHistoryItem(
                    company=w.get("company", ""),
                    title=w.get("title", ""),
                    start_date=w.get("start_date"),
                    end_date=w.get("end_date"),
                    description=w.get("description"),
                ) for w in profile.get("work_history", [])
            ],
            strengths=[],
            gaps=[],
            ats_issues=[],
            overall_score=0,
            embedding=embedding,
            certifications=profile.get("certifications", []),
            education=[
                EducationItem(
                    institution=e.get("institution", ""),
                    degree=e.get("degree"),
                    major=e.get("major"),
                    graduation_year=e.get("graduation_year"),
                ) for e in profile.get("education", [])
            ],
            achievements=profile.get("achievements", []),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

