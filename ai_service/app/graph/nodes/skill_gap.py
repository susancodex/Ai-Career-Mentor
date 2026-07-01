import logging

from app.agents.career_agent import run_skill_gap_agent
from app.graph.state import CareerMentorState

logger = logging.getLogger(__name__)


async def skill_gap_node(state: CareerMentorState) -> CareerMentorState:
    profile = state.get("resume_profile") or {}
    skills = profile.get("skills") or profile.get("extracted_skills") or []

    # Consume Job Research Agent output: use live market requirements as ground truth
    market_data = state.get("market_data") or {}
    market_requirements = market_data.get("current_market_requirements") or []


    try:
        result = await run_skill_gap_agent(
            resume_skills=skills,
            target_role=state.get("target_role") or "",
            resume_analysis=profile if profile else None,
            market_requirements=market_requirements if market_requirements else None,
        )
        return {**state, "skill_gap": result.model_dump()}
    except Exception as e:
        logger.exception("Skill gap node failed")
        return {**state, "errors": state.get("errors", []) + [f"skill_gap: {e}"]}
