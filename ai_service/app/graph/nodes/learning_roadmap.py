import logging

from app.agents.learning_agent import run_learning_agent
from app.graph.state import CareerMentorState

logger = logging.getLogger(__name__)


async def learning_roadmap_node(state: CareerMentorState) -> CareerMentorState:
    skill_gap = state.get("skill_gap") or {}
    missing = skill_gap.get("missing_skills", [])
    try:
        result = await run_learning_agent(
            missing_skills=missing,
            target_role=state.get("target_role") or "",
        )
        return {**state, "learning_roadmap": result.model_dump()}
    except Exception as e:
        logger.exception("Learning roadmap node failed")
        return {**state, "errors": state.get("errors", []) + [f"learning_roadmap: {e}"]}
