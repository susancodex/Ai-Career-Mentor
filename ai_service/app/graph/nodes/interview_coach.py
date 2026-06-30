import logging

from app.agents.interview_agent import run_question_generator, run_answer_scorer
from app.graph.state import CareerMentorState

logger = logging.getLogger(__name__)


async def interview_coach_node(state: CareerMentorState) -> CareerMentorState:
    mode = "evaluate" if state.get("interview_answer") else "generate"
    try:
        if mode == "generate":
            result = await run_question_generator(
                target_role=state.get("target_role") or "",
                session_id=state.get("user_id", ""),
                resume_id=state.get("user_id"),
            )
            return {**state, "interview_output": result.model_dump()}
        else:
            result = await run_answer_scorer(
                question_text=state.get("interview_question") or "",
                user_answer=state.get("interview_answer") or "",
                target_role=state.get("target_role") or "",
            )
            return {**state, "interview_output": result.model_dump()}
    except Exception as e:
        logger.exception("Interview coach node failed")
        return {**state, "errors": state.get("errors", []) + [f"interview_coach: {e}"]}
