from typing import TypedDict, Literal, Optional


class CareerMentorState(TypedDict, total=False):
    # Inputs
    user_id: str
    resume_id: Optional[str]
    resume_text: str
    target_role: Optional[str]
    location_preference: Optional[str]
    interview_answer: Optional[str]
    interview_question: Optional[str]
    requested_outputs: list[str]

    # Agent outputs
    resume_profile: Optional[dict]
    market_data: Optional[dict]
    skill_gap: Optional[dict]
    career_path: Optional[dict]
    interview_output: Optional[dict]
    learning_roadmap: Optional[dict]
    ats_feedback: Optional[dict]

    errors: list[str]
