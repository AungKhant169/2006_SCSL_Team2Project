from typing import Literal

from pydantic import BaseModel, Field

from schemas.school_payload import SchoolInfoSummary, Stage

Source = Literal["Rule-Based Plan", "AI-Generated Plan"]
RuleSort = Literal["distance", "grade"]


class CreateRoadmapRequest(BaseModel):
    stage: Stage
    postal: str | None = None
    # The PSLE AL (secondary), the O-Level L1R5 (post-secondary) or the polytechnic GPA (university).
    previous_academic_score: float | None = None
    # The O-Level ELR2B2 (post-secondary), for the polytechnics and ITE that admit on it.
    previous_academic_score_b: float | None = None


class CreateRuleRoadmapRequest(CreateRoadmapRequest):
    # What the rule-based plan ranks by first. "grade" is the default as that is how it ranked
    # before the student could choose.
    sort_by: RuleSort = "grade"
    # Schools further than this from the postal district are left out. There is no limit if empty.
    max_distance_km: float | None = Field(None, gt=0)


class CreateRoadmapResponse(BaseModel):
    # School ids in preference order.
    choices: list[int]
    # Details of the schools in `choices`, in the same order. An id that no longer
    # exists has no entry.
    schools: list[SchoolInfoSummary]


class RoadmapSave(BaseModel):
    stage: Stage
    source: Source
    choices: list[int]


class RoadmapEdit(BaseModel):
    choices: list[int]


class RoadmapResponse(CreateRoadmapResponse):
    stage: Stage
    source: Source
