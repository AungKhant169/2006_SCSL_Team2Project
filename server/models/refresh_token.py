import hashlib
import secrets
from datetime import datetime, timedelta

from sqlalchemy import DateTime, ForeignKey, String, delete
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base, Persistable, SessionLocal, utc_now

REFRESH_TOKEN_LIFETIME = timedelta(days=7)


def _digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class RefreshToken(Base, Persistable):
    """A single-use token that trades for a new token pair.

    Kept in the database so that sessions survive a restart or a reload of the server. Only a
    digest is stored, so a copy of the database cannot be used to sign in.
    """

    __tablename__ = "refresh_tokens"

    token_hash: Mapped[str] = mapped_column(String, unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)

    @classmethod
    def issue(cls, user_id: int) -> str:
        """Create a token for the user and return it. The token itself is never stored."""
        token = secrets.token_urlsafe(32)
        with SessionLocal() as session:
            # Tokens that were never used or revoked would otherwise pile up.
            session.execute(delete(cls).where(cls.expires_at <= utc_now()))
            session.add(
                cls(
                    token_hash=_digest(token),
                    user_id=user_id,
                    expires_at=utc_now() + REFRESH_TOKEN_LIFETIME,
                )
            )
            session.commit()
        return token

    @classmethod
    def consume(cls, token: str) -> int | None:
        """Use up the token. Returns its user's id, or None if it is unknown, used or expired."""
        stmt = (
            delete(cls)
            .where(cls.token_hash == _digest(token))
            .returning(cls.user_id, cls.expires_at)
        )
        with SessionLocal() as session:
            # Deleting and reading in one statement keeps a token single-use when requests race.
            row = session.execute(stmt).first()
            session.commit()
        if row is None or row.expires_at <= utc_now():
            return None
        return row.user_id

    @classmethod
    def revoke(cls, token: str) -> None:
        """Forget the token. Does nothing if it is unknown."""
        with SessionLocal() as session:
            session.execute(delete(cls).where(cls.token_hash == _digest(token)))
            session.commit()
