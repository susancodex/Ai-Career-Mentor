import pytest
from app.graph.build import route_after_resume_analysis, route_after_skill_gap
from app.graph.state import CareerMentorState


def test_route_after_resume_analysis():
    # If there are errors, always route to 'done'
    state = CareerMentorState(errors=["some error"])
    assert route_after_resume_analysis(state) == "done"

    # ats_optimization routes to ats_optimizer
    state = CareerMentorState(requested_outputs=["ats_optimization"])
    assert route_after_resume_analysis(state) == "ats_optimizer"

    # interview_output routes to interview_coach
    state = CareerMentorState(requested_outputs=["interview_output"])
    assert route_after_resume_analysis(state) == "interview_coach"

    # career_path with target_role routes to job_research
    state = CareerMentorState(requested_outputs=["career_path"], target_role="Engineer")
    assert route_after_resume_analysis(state) == "job_research"

    # career_path without target_role routes to skill_gap_direct
    state = CareerMentorState(requested_outputs=["career_path"], target_role=None)
    assert route_after_resume_analysis(state) == "skill_gap_direct"

    # skill_gap with target_role routes to job_research
    state = CareerMentorState(requested_outputs=["skill_gap"], target_role="Engineer")
    assert route_after_resume_analysis(state) == "job_research"

    # unknown or empty requested_outputs routes to done
    state = CareerMentorState(requested_outputs=[])
    assert route_after_resume_analysis(state) == "done"
    state = CareerMentorState(requested_outputs=["unknown"])
    assert route_after_resume_analysis(state) == "done"


def test_route_after_skill_gap():
    # If there are errors, always route to 'done'
    state = CareerMentorState(errors=["some error"])
    assert route_after_skill_gap(state) == "done"

    # career_path routes to career_coach
    state = CareerMentorState(requested_outputs=["career_path"])
    assert route_after_skill_gap(state) == "career_coach"

    # learning_roadmap routes to learning_roadmap
    state = CareerMentorState(requested_outputs=["learning_roadmap"])
    assert route_after_skill_gap(state) == "learning_roadmap"

    # skill_gap without career_path routes to done
    state = CareerMentorState(requested_outputs=["skill_gap"])
    assert route_after_skill_gap(state) == "done"

    # empty routes to done
    state = CareerMentorState(requested_outputs=[])
    assert route_after_skill_gap(state) == "done"
