from typing import List, Optional
from pydantic import BaseModel, Field


class LearningResourceItem(BaseModel):
    title: str
    url: str = ""
    resource_type: str = ""
    estimated_hours: Optional[float] = None
    order: int = 0
    skill_name: str = ""


class LearningRoadmapResult(BaseModel):
    title: str = ""
    description: str = ""
    resources: List[LearningResourceItem] = Field(default_factory=list)


class LearningRoadmapRequest(BaseModel):
    skill_gap_id: str
    missing_skills: List[str]
    target_role: str
