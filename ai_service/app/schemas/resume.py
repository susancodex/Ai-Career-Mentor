from typing import List, Optional
from pydantic import BaseModel, Field


class ExperienceItem(BaseModel):
    title: str
    company: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: str = ""
    technologies: List[str] = Field(default_factory=list)


class EducationItem(BaseModel):
    degree: str
    institution: str
    year: Optional[str] = None
    field_of_study: str = ""


class ResumeAnalysisResult(BaseModel):
    skills: List[str] = Field(default_factory=list)
    experience: List[ExperienceItem] = Field(default_factory=list)
    education: List[EducationItem] = Field(default_factory=list)
    summary: str = ""
    embedding: Optional[List[float]] = None


class ResumeAnalyzeRequest(BaseModel):
    resume_id: str
    raw_text: str
