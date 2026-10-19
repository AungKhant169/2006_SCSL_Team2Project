from typing import Literal

from pydantic import BaseModel

from schemas.school_payload import SchoolInfoSummary

Stage = Literal["preschool", "primary", "secondary", "postsec", "uni"]
Source = Literal["Rule-Based Plan", "AI-Generated Plan"]


class CreateRoadmapRequest(BaseModel):
    stage: Stage
    postal: str | None = None
    previous_academic_score: float | None = None


class CreateRoadmapResponse(BaseModel):
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

class RoadmapSchool(SchoolInfoSummary):
    # SchoolInfoSummary already has name, address, postal code, zone, level and type.
    id: int
    mrt_desc: str | None = None
    bus_desc: str | None = None


class AIRoadmapResponse(CreateRoadmapResponse):
    # Details of the schools in `choices`, in the same order.
    schools: list[RoadmapSchool]