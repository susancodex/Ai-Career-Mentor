from langgraph.graph import END, StateGraph

from app.graph.state import CareerMentorState
from app.graph.nodes import (
    resume_analyzer_node,
    job_research_node,
    skill_gap_node,
    career_coach_node,
    interview_coach_node,
    learning_roadmap_node,
    ats_optimizer_node,
)


def route_after_resume_analysis(state: CareerMentorState) -> str:
    if state.get("errors"):
        return "done"
    wants = state.get("requested_outputs", [])
    wants_ats = "ats_optimization" in wants
    wants_interview = "interview_output" in wants
    wants_path = any(k in wants for k in ["career_path", "skill_gap", "learning_roadmap"])
    if wants_path and state.get("target_role"):
        return "job_research"
    if wants_path:
        return "skill_gap_direct"
    if wants_ats:
        return "ats_optimizer"
    if wants_interview:
        return "interview_coach"
    return "done"


def route_after_skill_gap(state: CareerMentorState) -> str:
    if state.get("errors"):
        return "done"
    wants = state.get("requested_outputs", [])
    if "career_path" in wants:
        return "career_coach"
    if "learning_roadmap" in wants:
        return "learning_roadmap"
    return "done"


def build_career_mentor_graph() -> StateGraph:
    graph = StateGraph(CareerMentorState)

    graph.add_node("resume_analyzer", resume_analyzer_node)
    graph.add_node("job_research_node", job_research_node)
    graph.add_node("skill_gap_analyzer", skill_gap_node)
    graph.add_node("career_coach_node", career_coach_node)
    graph.add_node("interview_coach_node", interview_coach_node)
    graph.add_node("learning_roadmap_node", learning_roadmap_node)
    graph.add_node("ats_optimizer_node", ats_optimizer_node)

    graph.set_entry_point("resume_analyzer")

    graph.add_conditional_edges(
        "resume_analyzer",
        route_after_resume_analysis,
        {
            "job_research": "job_research_node",
            "ats_optimizer": "ats_optimizer_node",
            "skill_gap_direct": "skill_gap_analyzer",
            "interview_coach": "interview_coach_node",
            "done": END,
        },
    )

    graph.add_edge("job_research_node", "skill_gap_analyzer")

    graph.add_conditional_edges(
        "skill_gap_analyzer",
        route_after_skill_gap,
        {
            "career_coach": "career_coach_node",
            "learning_roadmap": "learning_roadmap_node",
            "done": END,
        },
    )

    graph.add_conditional_edges(
        "career_coach_node",
        lambda state: "learning_roadmap_node" if "learning_roadmap" in state.get("requested_outputs", []) else "done",
        {"learning_roadmap_node": "learning_roadmap_node", "done": END},
    )

    graph.add_edge("interview_coach_node", END)
    graph.add_edge("learning_roadmap_node", END)
    graph.add_edge("ats_optimizer_node", END)

    return graph.compile()


# ── Graph singleton ──────────────────────────────────────────────────
# All endpoint files should import get_graph() instead of calling
# build_career_mentor_graph() directly.  This avoids compiling the
# graph multiple times (once per endpoint module) at import time.
_compiled_graph = None


def get_graph():
    """Return the compiled career-mentor graph (lazily built, cached)."""
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_career_mentor_graph()
    return _compiled_graph
