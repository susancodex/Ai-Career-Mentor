from typing import List, Optional
from pydantic import BaseModel, Field


class QuestionItem(BaseModel):
    question_text: str
    category: str = "general"


class InterviewQuestionsResult(BaseModel):
    questions: List[QuestionItem] = Field(default_factory=list)


class InterviewQuestionsRequest(BaseModel):
    session_id: str
    target_role: str


class AnswerScoreResult(BaseModel):
    ai_feedback: str
    score: float = Field(ge=0.0, le=10.0)


class AnswerScoreRequest(BaseModel):
    question_id: str
    question_text: str
    user_answer: str
    target_role: str
