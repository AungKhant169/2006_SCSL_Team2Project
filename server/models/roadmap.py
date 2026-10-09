from fastapi import status
from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, validates

from core.exceptions import HttpError
from models.base import Base, Persistable

STAGES = {"preschool", "primary", "secondary", "postsec", "uni"}
SOURCES = {"Rule-Based Plan", "AI-Generated Plan"}
PLAN_LENGTH = 3


class RoadmapError(HttpError):
    ROADMAP_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "No saved roadmap was found for this account.",
    )
    INVALID_STAGE = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "Stage must be one of: preschool, primary, secondary, postsec, uni.",
    )
    INVALID_SOURCE = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "Source must be either 'Rule-Based Plan' or 'AI-Generated Plan'.",
    )
    INVALID_CHOICES = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "A roadmap must contain between 1 and 3 school ids.",
    )


class Roadmap(Base, Persistable):
    __tablename__ = "roadmaps"

    # Unique: an account keeps at most one saved roadmap.
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    stage: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)
    # School ids in preference order.
    choices: Mapped[list[int]] = mapped_column(JSON, nullable=False)

    @validates("stage")
    def stage_validator(self, key: str, value: str) -> str:
        if value not in STAGES:
            raise RoadmapError.INVALID_STAGE
        return value

    @validates("source")
    def source_validator(self, key: str, value: str) -> str:
        if value not in SOURCES:
            raise RoadmapError.INVALID_SOURCE
        return value

    @validates("choices")
    def choices_validator(self, key: str, value: list[int]) -> list[int]:
        if not 1 <= len(value) <= PLAN_LENGTH or not all(isinstance(v, int) for v in value):
            raise RoadmapError.INVALID_CHOICES
        return value

    @classmethod
    def get_for_user(cls, user_id: int) -> "Roadmap":
        if not (roadmap := cls.get_by_key(user_id=user_id)):
            raise RoadmapError.ROADMAP_NOT_FOUND
        return roadmap

    @classmethod
    def save(cls, user_id: int, stage: str, source: str, choices: list[int]) -> "Roadmap":
        """Store the user's roadmap, replacing any existing one."""
        if existing := cls.get_by_key(user_id=user_id):
            return cls.update(existing.id, stage=stage, source=source, choices=choices)
        return cls.create(user_id=user_id, stage=stage, source=source, choices=choices)

    @classmethod
    def edit(cls, user_id: int, choices: list[int]) -> "Roadmap":
        """Change the school choices of the saved roadmap."""
        roadmap = cls.get_for_user(user_id)
        return cls.update(roadmap.id, choices=choices)

    @classmethod
    def remove(cls, user_id: int) -> None:
        """Delete the user's roadmap. Does nothing if there isn't one."""
        if roadmap := cls.get_by_key(user_id=user_id):
            cls.delete(roadmap.id)