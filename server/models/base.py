import os

from sqlalchemy import Integer, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

# ------------------------------
# Database Setup
# ------------------------------

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./main.db")

# connect_args are required for SQLite to avoid sqlite3.ProgammingError
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


class Base(DeclarativeBase):
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)


class SessionLocal(Session):
    def __init__(self):
        super().__init__(bind=engine, autoflush=False, expire_on_commit=False)


# ------------------------------
# Database Mixin
# ------------------------------


class Persistable:
    @classmethod
    def get_by_id(cls, id):
        with SessionLocal() as session:
            return session.get(cls, id)

    @classmethod
    def get_by_key(cls, **filters):
        with SessionLocal() as session:
            return session.scalars(select(cls).filter_by(**filters)).first()

    @classmethod
    def create(cls, **kwargs):
        with SessionLocal() as session:
            instance = cls(**kwargs)
            session.add(instance)
            session.commit()
            return instance

    @classmethod
    def delete(cls, id):
        with SessionLocal() as session:
            if instance := session.get(cls, id):
                session.delete(instance)
                session.commit()
                return True

    @classmethod
    def update(cls, id, **kwargs):
        with SessionLocal() as session:
            if instance := session.get(cls, id):
                for key, value in kwargs.items():
                    setattr(instance, key, value)
                session.commit()
                return instance
