import re

from fastapi import status
from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from core.exceptions import BaseError
from models.base import Base, Persistable

POSTAL_PATTERN = re.compile(r"\d{6}")
DEFAULT_LEVEL = "secondary"
DEFAULT_PRIMARY_RESULT = "None"


def _invalid_score(message: str) -> str:
    return f"Invalid academic score! {message}"


class ProfileError(BaseError):
    INVALID_POSTAL = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "Please enter a valid 6-digit Singapore postal code.",
    )
    INVALID_PSLE = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        _invalid_score("PSLE AL must be a whole number from 4 to 32."),
    )
    MISSING_O_LEVEL = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        _invalid_score("Enter an L1R5 or ELR2B2 aggregate."),
    )
    INVALID_L1R5 = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        _invalid_score("L1R5 must be a whole number from 2 to 54."),
    )
    INVALID_ELR2B2 = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        _invalid_score("ELR2B2 must be a whole number."),
    )
    MISSING_UNI_SCORE = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        _invalid_score("Enter a polytechnic GPA or A-Level rank points."),
    )
    INVALID_GPA = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        _invalid_score("GPA must be between 0.00 and 4.00."),
    )
    INVALID_RANK_POINTS = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        _invalid_score("Rank points must be between 0 and 90."),
    )


def _whole_between(value: float | None, low: float, high: float) -> bool:
    return value is not None and value == int(value) and low <= value <= high


def validate_scores(
    level: str, score_a: float | None, score_b: float | None
) -> tuple[float | None, float | None]:
    """Check the academic results the target level asks for, and drop the ones it does not.

    The first score is the PSLE AL (secondary), the O-Level L1R5 (post-secondary) or the
    polytechnic GPA (university); the second is the ELR2B2 or the A-Level rank points.
    """
    match level:
        case "secondary":
            if not _whole_between(score_a, 4, 32):
                raise ProfileError.INVALID_PSLE()
            return score_a, None
        case "postsec":
            if score_a is None and score_b is None:
                raise ProfileError.MISSING_O_LEVEL()
            if score_a is not None and not _whole_between(score_a, 2, 54):
                raise ProfileError.INVALID_L1R5()
            if score_b is not None and not _whole_between(score_b, 0, float("inf")):
                raise ProfileError.INVALID_ELR2B2()
            return score_a, score_b
        case "uni":
            if score_a is None and score_b is None:
                raise ProfileError.MISSING_UNI_SCORE()
            if score_a is not None and not 0 <= score_a <= 4:
                raise ProfileError.INVALID_GPA()
            if score_b is not None and not 0 <= score_b <= 90:
                raise ProfileError.INVALID_RANK_POINTS()
            return score_a, score_b
        case _:
            return None, None


class Profile(Base, Persistable):
    """What the roadmap needs to know about a student: no name, date of birth or NRIC."""

    __tablename__ = "profiles"

    # Unique: an account has one profile.
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True, index=True
    )
    # The transition the student is planning for (a roadmap stage).
    level: Mapped[str] = mapped_column(String, nullable=False)
    score_a: Mapped[float | None] = mapped_column(Float)
    score_b: Mapped[float | None] = mapped_column(Float)
    postal: Mapped[str | None] = mapped_column(String(6))
    primary_result: Mapped[str] = mapped_column(String, nullable=False)

    @classmethod
    def for_user(cls, user_id: int) -> "Profile":
        """The saved profile, or the starting values of an account that has not saved one."""
        return cls.get_by_key(user_id=user_id) or cls(
            user_id=user_id,
            level=DEFAULT_LEVEL,
            score_a=None,
            score_b=None,
            postal=None,
            primary_result=DEFAULT_PRIMARY_RESULT,
        )

    @classmethod
    def save(
        cls,
        user_id: int,
        level: str,
        score_a: float | None,
        score_b: float | None,
        postal: str,
        primary_result: str,
    ) -> "Profile":
        """Validate and store the user's profile, replacing the previous one."""
        if not POSTAL_PATTERN.fullmatch(postal):
            raise ProfileError.INVALID_POSTAL()
        score_a, score_b = validate_scores(level, score_a, score_b)
        values = {
            "level": level,
            "score_a": score_a,
            "score_b": score_b,
            "postal": postal,
            "primary_result": primary_result,
        }
        if existing := cls.get_by_key(user_id=user_id):
            return cls.update(existing.id, **values)
        return cls.create(user_id=user_id, **values)
