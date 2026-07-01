from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import verify_internal_signature
from app.core.db import get_resume_analysis
from app.graph.build import get_graph
from app.schemas.career import (
    SkillGapRequest, SkillGapResult,
    CareerPathRequest, CareerPathResult, CareerStep
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
        initial = {
            "user_id": body.resume_id,
            "resume_id": body.resume_id,
            "resume_text": analysis.get("raw_extracted_text", ""),
            "target_role": body.target_role,
            "requested_outputs": ["skill_gap"],
            "resume_profile": {
                "skills": analysis.get("extracted_skills", []),
                "years_experience": analysis.get("years_of_experience", 0),
                "work_history": analysis.get("work_history", []),
                "certifications": analysis.get("certifications", []),
                "education": analysis.get("education", []),
                "achievements": analysis.get("achievements", []),
            },
            "errors": [],
        }
        final = await get_graph().ainvoke(initial)

        if final.get("errors"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"LangGraph execution failed: {', '.join(final['errors'])}",
            )

        skill_gap = final.get("skill_gap") or {}
        return SkillGapResult(
            missing_skills=skill_gap.get("missing_skills", []),
            existing_skills=skill_gap.get("matched_skills") or skill_gap.get("existing_skills") or [],
            matched_skills=skill_gap.get("matched_skills") or skill_gap.get("existing_skills") or [],
            transferable_skills=skill_gap.get("transferable_skills", []),
            gap_severity=skill_gap.get("gap_severity", "moderate"),
            analysis=skill_gap.get("analysis", ""),
        )
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
    """
    Generate ranked career paths toward a target role.

    All inputs come from real stored data (ResumeAnalysis + Profile) —
    the Django task fetches them before calling this endpoint.
    """
    try:
        analysis = await get_resume_analysis(body.resume_id)
        initial = {
            "user_id": body.resume_id,
            "resume_id": body.resume_id,
            "resume_text": analysis.get("raw_extracted_text", ""),
            "target_role": body.target_role,
            "location_preference": body.location_preference,
            "requested_outputs": ["career_path"],
            "resume_profile": {
                "skills": body.existing_skills or analysis.get("extracted_skills", []),
                "years_experience": body.years_experience or analysis.get("years_of_experience", 0),
                "work_history": analysis.get("work_history", []),
                "certifications": analysis.get("certifications", []),
                "education": analysis.get("education", []),
                "achievements": analysis.get("achievements", []),
            },
            "errors": [],
        }
        final = await get_graph().ainvoke(initial)

        if final.get("errors"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"LangGraph execution failed: {', '.join(final['errors'])}",
            )

        career_path = final.get("career_path") or {}
        paths = []
        for path in career_path.get("paths", []):
            steps = []
            for step in path:
                steps.append(
                    CareerStep(
                        role=step.get("role", ""),
                        timeframe=step.get("timeframe", ""),
                        reasoning=step.get("reasoning", ""),
                        required_skills=step.get("required_skills", []),
                    )
                )
            paths.append(steps)

        return CareerPathResult(
            paths=paths,
            recommended_path_index=career_path.get("recommended_path_index", 0),
            summary=career_path.get("summary", ""),
            prerequisite_check=career_path.get("prerequisite_check", ""),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

