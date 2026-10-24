from datetime import datetime

from sqlalchemy import DateTime, Integer, func, select
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base, Persistable, SessionLocal, utc_now


class DatasetUpdate(Base, Persistable):
    """One successful load of the school data. Written in the same transaction as the load."""

    __tablename__ = "dataset_updates"

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    schools: Mapped[int] = mapped_column(Integer, nullable=False)
    added: Mapped[int] = mapped_column(Integer, nullable=False)
    updated: Mapped[int] = mapped_column(Integer, nullable=False)

    @classmethod
    def last_time(cls) -> datetime | None:
        """When the school data was last loaded, or None if it never was."""
        with SessionLocal() as session:
            return session.scalar(select(func.max(cls.created_at)))
