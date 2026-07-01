from typing import List, Optional
from pydantic import BaseModel, Field


class EducationItem(BaseModel):
    institution: str
    degree: Optional[str] = None
    major: Optional[str] = None
    graduation_year: Optional[str] = None


class WorkHistoryItem(BaseModel):
    company: str
    title: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None


class ResumeProfile(BaseModel):
    skills: List[str] = Field(default_factory=list)
    years_experience: int = 0
    work_history: List[WorkHistoryItem] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    education: List[EducationItem] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)
    embedding: Optional[List[float]] = None



class ResumeAnalysisResult(BaseModel):
    extracted_skills: List[str] = Field(default_factory=list)
    years_of_experience: int = 0
    work_history: List[WorkHistoryItem] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    ats_issues: List[str] = Field(default_factory=list)
    overall_score: int = Field(default=0, ge=0, le=100)
    embedding: Optional[List[float]] = None

    # Certifications, education, achievements mapping for internal consistency
    certifications: List[str] = Field(default_factory=list)
    education: List[EducationItem] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)


class ResumeAnalyzeRequest(BaseModel):
    resume_id: str
    raw_text: str
    target_role: Optional[str] = None

