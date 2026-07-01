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
    prerequisite_check: str = ""


class CareerPathRequest(BaseModel):
    resume_id: str
    target_role: str = ""
    existing_skills: List[str] = Field(default_factory=list)
    years_experience: int = 0
    current_role: Optional[str] = None
    location_preference: Optional[str] = None


class SkillGapResult(BaseModel):
    missing_skills: List[str] = Field(default_factory=list)
    existing_skills: List[str] = Field(default_factory=list)
    matched_skills: List[str] = Field(default_factory=list)
    transferable_skills: List[str] = Field(default_factory=list)
    gap_severity: str = "moderate"  # "minor" | "moderate" | "significant"
    analysis: str = ""



class SkillGapRequest(BaseModel):
    resume_id: str
    target_role: str
