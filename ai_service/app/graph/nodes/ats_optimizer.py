import logging

from app.graph.state import CareerMentorState

logger = logging.getLogger(__name__)


async def ats_optimizer_node(state: CareerMentorState) -> CareerMentorState:
    resume_text = state.get("resume_text", "")
    target_role = state.get("target_role") or ""

    # Simple deterministic ATS checks rather than another LLM call for this stub.
    # This node exists to prove the graph branches correctly; richer scoring
    # should replace this block with a real ATS agent call.
    lines = [ln.strip() for ln in resume_text.splitlines() if ln.strip()]
    long_lines = [ln for ln in lines if len(ln) > 120]
    has_metrics = any(c in resume_text for c in "%$1234567890")

    issues = []
    if len(long_lines) > 5:
        issues.append(f"{len(long_lines)} lines exceed 120 characters — may not parse well in ATS.")
    if not has_metrics:
        issues.append("Resume lacks quantifiable metrics (%, $, or numbers) — add achievements with impact.")
    if target_role and target_role.lower() not in resume_text.lower():
        issues.append(f"Target role '{target_role}' is not explicitly mentioned in the resume text.")

    score = max(0, 100 - len(issues) * 15)
    feedback = {
        "ats_compatibility_score": score,
        "formatting_issues": issues,
        "keyword_gaps": [],
        "rewritten_bullet_suggestions": [],
    }
    return {**state, "ats_feedback": feedback}
