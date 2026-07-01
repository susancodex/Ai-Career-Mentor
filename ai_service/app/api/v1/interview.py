from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.security import verify_internal_signature
import re
from app.graph.build import get_graph
from app.schemas.interview import (
    InterviewQuestionsRequest, InterviewQuestionsResult,
    AnswerScoreRequest, AnswerScoreResult,
)

router = APIRouter(prefix="/interview", tags=["interview"])


@router.post(
    "/questions/generate",
    response_model=InterviewQuestionsResult,
    dependencies=[Depends(verify_internal_signature)],
)
async def generate_questions(request: Request, body: InterviewQuestionsRequest):
    try:
        from app.core.db import get_resume_analysis
        resume_profile = {}
        if body.resume_id:
            analysis = await get_resume_analysis(body.resume_id)
            resume_profile = {
                "skills": analysis.get("extracted_skills", []),
                "years_experience": analysis.get("years_of_experience", 0),
                "work_history": analysis.get("work_history", []),
                "certifications": analysis.get("certifications", []),
                "education": analysis.get("education", []),
                "achievements": analysis.get("achievements", []),
            }

        initial = {
            "user_id": body.session_id,
            "resume_id": body.resume_id,
            "target_role": body.target_role,
            "requested_outputs": ["interview_output"],
            "resume_profile": resume_profile,
            "errors": [],
        }

        final = await get_graph().ainvoke(initial)

        if final.get("errors"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"LangGraph execution failed: {', '.join(final['errors'])}",
            )

        interview_output = final.get("interview_output") or {}
        return InterviewQuestionsResult(**interview_output)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post(
    "/answer/score",
    response_model=AnswerScoreResult,
    dependencies=[Depends(verify_internal_signature)],
)
async def score_answer(request: Request, body: AnswerScoreRequest):
    try:
        initial = {
            "user_id": body.question_id,
            "target_role": body.target_role,
            "interview_question": body.question_text,
            "interview_answer": body.user_answer,
            "requested_outputs": ["interview_output"],
            "errors": [],
        }

        if body.resume_context:
            skills_match = re.search(r"Skills:\s*(.*?)\.\s*", body.resume_context)
            roles_match = re.search(r"Recent roles:\s*(.*?)\.\s*$", body.resume_context)
            skills = [s.strip() for s in skills_match.group(1).split(",")] if skills_match else []
            work_history = []
            if roles_match:
                for r in roles_match.group(1).split(";"):
                    if " at " in r:
                        title, company = r.split(" at ", 1)
                        work_history.append({"title": title.strip(), "company": company.strip()})
            initial["resume_profile"] = {
                "skills": skills,
                "work_history": work_history,
            }

        final = await get_graph().ainvoke(initial)

        if final.get("errors"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"LangGraph execution failed: {', '.join(final['errors'])}",
            )

        interview_output = final.get("interview_output") or {}
        return AnswerScoreResult(**interview_output)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

