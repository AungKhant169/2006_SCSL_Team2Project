from typing import Literal

from pydantic import BaseModel

Stage = Literal["preschool", "primary", "secondary", "postsec", "uni"]
Source = Literal["Rule-Based Plan", "AI-Generated Plan"]


class AIRoadmapRequest(BaseModel):
    stage: Stage
    postal: str | None = None
    previous_academic_score: float | None = None


class AIRoadmapResponse(BaseModel):
    # School ids in preference order.
    choices: list[int]


class RoadmapSave(BaseModel):
    stage: Stage
    source: Source
    choices: list[int]


class RoadmapEdit(BaseModel):
    choices: list[int]


class RoadmapResponse(BaseModel):
    stage: Stage
    source: Source
    choices: list[int]
