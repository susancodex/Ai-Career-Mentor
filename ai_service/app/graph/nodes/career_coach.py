import logging

from app.agents.career_agent import run_career_path_agent
from app.graph.state import CareerMentorState

logger = logging.getLogger(__name__)


async def career_coach_node(state: CareerMentorState) -> CareerMentorState:
    profile = state.get("resume_profile") or {}
    try:
        result = await run_career_path_agent(
            work_history=profile.get("work_history", []),
            years_of_experience=profile.get("years_of_experience", 0),
            skills=profile.get("extracted_skills", []),
            target_role=state.get("target_role") or "",
        )
        return {**state, "career_path": result.model_dump()}
    except Exception as e:
        logger.exception("Career coach node failed")
        return {**state, "errors": state.get("errors", []) + [f"career_coach: {e}"]}
