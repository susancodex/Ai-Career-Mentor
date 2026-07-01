import logging

from app.agents.interview_agent import run_question_generator, run_answer_scorer
from app.graph.state import CareerMentorState

logger = logging.getLogger(__name__)


async def interview_coach_node(state: CareerMentorState) -> CareerMentorState:
    mode = "evaluate" if state.get("interview_answer") else "generate"
    # resume_id is stored separately from user_id in state
    resume_id = state.get("resume_id") or state.get("user_id")
    session_id = state.get("user_id", "")

    # Pass resume_profile as resume_context for grounded question generation / scoring
    profile = state.get("resume_profile") or {}
    resume_context = None
    if profile:
        skills = ", ".join(profile.get("extracted_skills", [])[:10])
        history = "; ".join(
            f"{e.get('title')} at {e.get('company')}"
            for e in profile.get("work_history", [])[:3]
        )
        if skills or history:
            resume_context = f"Skills: {skills}. Recent roles: {history}."

    try:
        if mode == "generate":
            result = await run_question_generator(
                target_role=state.get("target_role") or "",
                session_id=session_id,
                resume_id=resume_id,
            )
            return {**state, "interview_output": result.model_dump()}
        else:
            result = await run_answer_scorer(
                question_text=state.get("interview_question") or "",
                user_answer=state.get("interview_answer") or "",
                target_role=state.get("target_role") or "",
                session_id=session_id,
                resume_context=resume_context,
            )
            return {**state, "interview_output": result.model_dump()}
    except Exception as e:
        logger.exception("Interview coach node failed")
        return {**state, "errors": state.get("errors", []) + [f"interview_coach: {e}"]}
