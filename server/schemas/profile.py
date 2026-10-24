from typing import Literal

from pydantic import BaseModel

from schemas.roadmap import Stage

PrimaryResult = Literal["None", "Kindergarten completion"]


class ProfileSave(BaseModel):
    level: Stage
    # The PSLE AL, L1R5 or polytechnic GPA, and the ELR2B2 or A-Level rank points.
    score_a: float | None = None
    score_b: float | None = None
    postal: str
    primary_result: PrimaryResult = "None"


class ProfileResponse(BaseModel):
    level: Stage
    score_a: float | None = None
    score_b: float | None = None
    # Empty until the student has saved one.
    postal: str | None = None
    primary_result: PrimaryResult
