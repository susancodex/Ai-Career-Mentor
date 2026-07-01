from typing import List, Optional
from pydantic import BaseModel, Field


class CareerStep(BaseModel):
    role: str
    timeframe: str
    reasoning: str
    required_skills: List[str] = Field(default_factory=list)


class CareerPathResult(BaseModel):
    paths: List[List[CareerStep]]
    recommended_path_index: int = 0
    summary: str = ""


class CareerPathRequest(BaseModel):
    resume_id: str
    target_role: str = ""
    existing_skills: List[str] = Field(default_factory=list)


class SkillGapResult(BaseModel):
    missing_skills: List[str] = Field(default_factory=list)
    existing_skills: List[str] = Field(default_factory=list)
    analysis: str = ""


class SkillGapRequest(BaseModel):
    resume_id: str
    target_role: str
