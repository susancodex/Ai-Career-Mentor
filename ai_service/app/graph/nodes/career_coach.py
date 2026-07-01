import logging

from app.agents.career_agent import run_career_path_agent
from app.graph.state import CareerMentorState

logger = logging.getLogger(__name__)


async def career_coach_node(state: CareerMentorState) -> CareerMentorState:
    profile = state.get("resume_profile") or {}

    # Consume Skill Gap Agent output as ground truth — do not re-derive gaps
    skill_gap = state.get("skill_gap") or {}
    missing_skills = skill_gap.get("missing_skills") if skill_gap else None
    gap_severity = skill_gap.get("gap_severity") if skill_gap else None

    try:
        result = await run_career_path_agent(
            work_history=profile.get("work_history", []),
            years_of_experience=profile.get("years_experience") or profile.get("years_of_experience") or 0,
            skills=profile.get("skills") or profile.get("extracted_skills") or [],
            target_role=state.get("target_role") or "",
            missing_skills=missing_skills,
            gap_severity=gap_severity,
        )

        return {**state, "career_path": result.model_dump()}
    except Exception as e:
        logger.exception("Career coach node failed")
        return {**state, "errors": state.get("errors", []) + [f"career_coach: {e}"]}
