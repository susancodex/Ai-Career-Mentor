from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import verify_internal_signature
from app.graph.build import build_career_mentor_graph

router = APIRouter(prefix="/agents", tags=["agents"])

_graph = build_career_mentor_graph()


class AgentRunRequest(BaseModel):
    user_id: str
    resume_text: str
    target_role: str | None = None
    location_preference: str | None = None
    requested_outputs: list[str] | None = None


class InterviewRunRequest(BaseModel):
    resume_id: str
    target_role: str
    mode: str = "generate"
    question: str | None = None
    user_answer: str | None = None


@router.post("/run/")
async def run_agent_graph(request: AgentRunRequest, _=Depends(verify_internal_signature)):
    initial: dict[str, Any] = {
        "user_id": request.user_id,
        "resume_text": request.resume_text,
        "target_role": request.target_role,
        "location_preference": request.location_preference,
        "requested_outputs": request.requested_outputs or [],
        "errors": [],
    }
    try:
        final = await _graph.ainvoke(initial)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    if final.get("errors"):
        return {
            "partial": True,
            "errors": final["errors"],
            "results": {k: v for k, v in final.items() if k not in ("resume_text", "errors")},
        }

    return {k: v for k, v in final.items() if k not in ("resume_text", "errors")}


@router.post("/interview/")
async def run_interview_agent(request: InterviewRunRequest, _=Depends(verify_internal_signature)):
    from app.core.db import get_resume_analysis

    analysis = await get_resume_analysis(request.resume_id)
    state: dict[str, Any] = {
        "user_id": request.resume_id,
        "resume_text": "",
        "target_role": request.target_role,
        "interview_question": request.question,
        "interview_answer": request.user_answer,
        "requested_outputs": ["interview_output"],
        "errors": [],
        "resume_profile": {
            "skills": analysis.get("skills", []),
            "experience": analysis.get("experience", []),
            "education": analysis.get("education", []),
            "summary": analysis.get("summary", ""),
        },
    }
    try:
        final = await _graph.ainvoke(state)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    if final.get("errors"):
        return {
            "partial": True,
            "errors": final["errors"],
            "result": final.get("interview_output"),
        }
    return final.get("interview_output")
