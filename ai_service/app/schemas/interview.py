from typing import List, Optional
from pydantic import BaseModel, Field


class QuestionItem(BaseModel):
    question_text: str
    category: str = "general"
    # Which resume item (project, technology, role/company) this question is
    # anchored to. Only populated for category="resume_specific".
    anchored_to: Optional[str] = None


class InterviewQuestionsResult(BaseModel):
    questions: List[QuestionItem] = Field(default_factory=list)


class InterviewQuestionsRequest(BaseModel):
    session_id: str
    target_role: str
    # Optional — when provided the agent uses real resume data to anchor
    # at least 40% of questions to specific items in the candidate's history.
    resume_id: Optional[str] = None
    years_experience: int = 0


class AnswerScoreResult(BaseModel):
    ai_feedback: str
    score: float = Field(ge=0.0, le=10.0)


class AnswerScoreRequest(BaseModel):
    question_id: str
    question_text: str
    user_answer: str
    target_role: str
    # Resume context passed so the scorer can evaluate whether the answer
    # genuinely reflects the candidate's actual experience.
    resume_context: Optional[str] = None
