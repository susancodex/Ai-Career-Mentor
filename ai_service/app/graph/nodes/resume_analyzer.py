import logging

from app.agents.resume_agent import run_resume_agent
from app.graph.state import CareerMentorState

logger = logging.getLogger(__name__)


async def resume_analyzer_node(state: CareerMentorState) -> CareerMentorState:
    if state.get("resume_profile"):
        logger.info("Resume profile already in state, skipping resume analyzer node.")
        return state

    try:
        profile = await run_resume_agent(
            raw_text=state["resume_text"],
            resume_id=state.get("user_id", ""),
            session_id=state.get("user_id"),
        )
        return {**state, "resume_profile": profile.model_dump()}
    except Exception as e:
        logger.exception("Resume analyzer node failed")
        return {**state, "errors": state.get("errors", []) + [f"resume_analyzer: {e}"]}

