import re
from datetime import datetime

from fastapi import status
from sqlalchemy import DateTime, ForeignKey, Text, UniqueConstraint, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column, validates

from core.exceptions import HttpError
from models.base import Base, Persistable, SessionLocal, utc_now
from models.school_record import SchoolInfo, SchoolInfoError
from models.user import User

MAX_REVIEW_WORDS = 200
TAG_PATTERN = re.compile(r"<[^>]*>")


class ReviewError(HttpError):
    REVIEW_NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "This review could not be found.",
    )
    REVIEW_FORBIDDEN = (
        status.HTTP_403_FORBIDDEN,
        "You can only change your own review.",
    )
    REVIEW_ALREADY_EXISTS = (
        status.HTTP_409_CONFLICT,
        "You have already reviewed this school.",
    )
    REVIEW_BLANK = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "Review text cannot be blank or consist entirely of spaces.",
    )
    REVIEW_TOO_LONG = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "Review text must not exceed 200 words.",
    )


class Review(Base, Persistable):
    __tablename__ = "reviews"
    # One review per account per school.
    __table_args__ = (UniqueConstraint("user_id", "school_id"),)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    # Empty until the review has been edited.
    updated_at: Mapped[datetime | None] = mapped_column(DateTime)

    @validates("text")
    def text_validator(self, key: str, value: str) -> str:
        value = TAG_PATTERN.sub("", value).strip()
        if not value:
            raise ReviewError.REVIEW_BLANK
        if len(value.split()) > MAX_REVIEW_WORDS:
            raise ReviewError.REVIEW_TOO_LONG
        return value

    @classmethod
    def for_school(cls, school_id: int) -> list[tuple["Review", str]]:
        """Reviews of a school with their authors' usernames, newest first."""
        stmt = (
            select(cls, User.username)
            .join(User, User.id == cls.user_id)
            .where(cls.school_id == school_id)
            .order_by(cls.created_at.desc())
        )
        with SessionLocal() as session:
            return [(review, username) for review, username in session.execute(stmt)]

    @classmethod
    def submit(cls, user_id: int, school_id: int, text: str) -> "Review":
        """Store a new review. An account may review each school only once."""
        if SchoolInfo.get_by_id(school_id) is None:
            raise SchoolInfoError.SCHOOL_NOT_FOUND
        if cls.get_by_key(user_id=user_id, school_id=school_id):
            raise ReviewError.REVIEW_ALREADY_EXISTS
        try:
            return cls.create(user_id=user_id, school_id=school_id, text=text)
        except IntegrityError:
            raise ReviewError.REVIEW_ALREADY_EXISTS

    @classmethod
    def edit(cls, user_id: int, review_id: int, text: str) -> "Review":
        """Change the text of the user's own review."""
        review = cls._get_owned(user_id, review_id)
        return cls.update(review.id, text=text, updated_at=utc_now())

    @classmethod
    def remove(cls, user_id: int, review_id: int) -> None:
        """Delete the user's own review."""
        review = cls._get_owned(user_id, review_id)
        cls.delete(review.id)

    @classmethod
    def _get_owned(cls, user_id: int, review_id: int) -> "Review":
        if not (review := cls.get_by_id(review_id)):
            raise ReviewError.REVIEW_NOT_FOUND
        if review.user_id != user_id:
            raise ReviewError.REVIEW_FORBIDDEN
        return review
