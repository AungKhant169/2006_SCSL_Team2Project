from sqlalchemy import ForeignKey, UniqueConstraint, select
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base, Persistable, SessionLocal
from models.school_record import SchoolInfo, SchoolInfoError


class Bookmark(Base, Persistable):
    __tablename__ = "bookmarks"
    __table_args__ = (UniqueConstraint("user_id", "school_id"),)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), index=True)

    @classmethod
    def for_user(cls, user_id: int) -> list[SchoolInfo]:
        """The schools the user has bookmarked, in the order they were saved."""
        stmt = (
            select(SchoolInfo)
            .join(cls, cls.school_id == SchoolInfo.id)
            .where(cls.user_id == user_id)
            .order_by(cls.id)
        )
        with SessionLocal() as session:
            return list(session.scalars(stmt))

    @classmethod
    def add(cls, user_id: int, school_id: int) -> None:
        """Bookmark a school. Does nothing if it is already bookmarked."""
        if SchoolInfo.get_by_id(school_id) is None:
            raise SchoolInfoError.SCHOOL_NOT_FOUND()
        if not cls.get_by_key(user_id=user_id, school_id=school_id):
            cls.create(user_id=user_id, school_id=school_id)

    @classmethod
    def remove(cls, user_id: int, school_id: int) -> None:
        """Remove a bookmark. Does nothing if there isn't one."""
        if bookmark := cls.get_by_key(user_id=user_id, school_id=school_id):
            cls.delete(bookmark.id)
