from typing import List, Optional
from pydantic import BaseModel, Field


class JobMatchItem(BaseModel):
    job_title: str
    company: str
    location: str = ""
    description: str = ""
    fit_score: float = 0.0
    fit_explanation: str = ""
    external_url: str = ""


class JobMatchesResult(BaseModel):
    matches: List[JobMatchItem] = Field(default_factory=list)


class JobMatchRequest(BaseModel):
    resume_id: str
