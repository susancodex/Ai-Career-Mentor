from typing import List, Optional
from pydantic import BaseModel, Field


class WorkHistoryItem(BaseModel):
    company: str
    title: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class ResumeAnalysisResult(BaseModel):
    extracted_skills: List[str] = Field(default_factory=list)
    years_of_experience: int = 0
    work_history: List[WorkHistoryItem] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    ats_issues: List[str] = Field(default_factory=list)
    overall_score: int = Field(default=0, ge=0, le=100)
    embedding: Optional[List[float]] = None


class ResumeAnalyzeRequest(BaseModel):
    resume_id: str
    raw_text: str
    target_role: Optional[str] = None
