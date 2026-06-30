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
    wants_ats = "ats_optimization" in state.get("requested_outputs", [])
    wants_path = any(
        k in state.get("requested_outputs", [])
        for k in ["career_path", "skill_gap", "learning_roadmap"]
    )
    if wants_path and state.get("target_role"):
        return "job_research"
    if wants_path:
        return "skill_gap_direct"
    if wants_ats:
        return "ats_optimizer"
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
    graph.add_node("job_research", job_research_node)
    graph.add_node("skill_gap", skill_gap_node)
    graph.add_node("career_coach", career_coach_node)
    graph.add_node("interview_coach", interview_coach_node)
    graph.add_node("learning_roadmap", learning_roadmap_node)
    graph.add_node("ats_optimizer", ats_optimizer_node)

    graph.set_entry_point("resume_analyzer")

    graph.add_conditional_edges(
        "resume_analyzer",
        route_after_resume_analysis,
        {
            "job_research": "job_research",
            "ats_optimizer": "ats_optimizer",
            "skill_gap_direct": "skill_gap",
            "done": END,
        },
    )

    graph.add_edge("job_research", "skill_gap")

    graph.add_conditional_edges(
        "skill_gap",
        route_after_skill_gap,
        {
            "career_coach": "career_coach",
            "learning_roadmap": "learning_roadmap",
            "done": END,
        },
    )

    graph.add_conditional_edges(
        "career_coach",
        lambda state: "learning_roadmap" if "learning_roadmap" in state.get("requested_outputs", []) else "done",
        {"learning_roadmap": "learning_roadmap", "done": END},
    )

    graph.add_edge("learning_roadmap", END)
    graph.add_edge("ats_optimizer", END)

    return graph.compile()
