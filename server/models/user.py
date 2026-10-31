import re
from datetime import datetime, timedelta, timezone
from enum import StrEnum
from typing import Self

import bcrypt
import jwt
from fastapi import status
from sqlalchemy import Index, String, func, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column, validates

from core.exceptions import BaseError
from core.settings import settings
from models.base import Base, Persistable
from models.refresh_token import RefreshToken

SECRET_KEY = settings.secret_key.get_secret_value()

USERNAME_PATTERN = re.compile(r"[A-Za-z0-9]{1,36}")
PASSWORD_PATTERN = re.compile(r"(?=.*\d)(?=.*[^A-Za-z0-9])[\x20-\x7E]{8,36}")
ROLE_USER = "user"
ROLE_ADMIN = "admin"


def always_admin_usernames() -> set[str]:
    """Usernames in ADMIN_USERNAMES (.env, comma separated) are admins whatever their role."""
    return settings.admin_username_set


class Role(StrEnum):
    USER = "user"
    ADMIN = "admin"


class UserError(BaseError):
    ACCESS_TOKEN_INVALID = (
        status.HTTP_401_UNAUTHORIZED,
        "Your session is invalid. Please log in again.",
    )
    REFRESH_TOKEN_INVALID = (
        status.HTTP_401_UNAUTHORIZED,
        "Your session has expired. Please log in again.",
    )
    LOGIN_INVALID_USERNAME = (
        status.HTTP_401_UNAUTHORIZED,
        "No account exists with this username. Please check your username or create a new account.",
    )
    LOGIN_INVALID_PASSWORD = (
        status.HTTP_401_UNAUTHORIZED,
        "The password entered is incorrect. Please try again.",
    )
    REGISTER_INVALID_USERNAME = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "Username must be between 1 and 36 characters long and contain only letters and numbers.",
    )
    REGISTER_INVALID_PASSWORD = (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "Password must be between 8 and 36 characters long and contain at least one number and one special character.",
    )
    USER_ALREADY_EXISTS = (
        status.HTTP_409_CONFLICT,
        "This username is already taken. Please choose a different username.",
    )
    USER_NOT_FOUND = (
        status.HTTP_401_UNAUTHORIZED,
        "This account no longer exists. Please log in or create a new account.",
    )
    ADMIN_REQUIRED = (
        status.HTTP_403_FORBIDDEN,
        "This action is restricted to administrator accounts.",
    )


class User(Base, Persistable):
    __tablename__ = "users"
    # Usernames are unique ignoring case, so "BOSS" cannot be registered next to "boss";
    # is_admin compares ADMIN_USERNAMES case-insensitively and relies on this.
    __table_args__ = (
        Index("ix_users_username_lower", func.lower(text("username")), unique=True),
    )

    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    password: Mapped[str] = mapped_column(String, nullable=False)
    # Registration always creates plain users; administrators are promoted out of band.
    role: Mapped[str] = mapped_column(
        String, nullable=False, default=Role.USER, server_default=Role.USER
    )

    def _create_access_token(self) -> str:
        expiry = datetime.now(timezone.utc) + timedelta(minutes=5)
        payload = {"sub": str(self.id), "exp": expiry}
        return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

    def _create_refresh_token(self) -> str:
        return RefreshToken.issue(self.id)

    def create_tokens(self) -> tuple[str, str]:
        return self._create_access_token(), self._create_refresh_token()

    @property
    def is_admin(self) -> bool:
        return (
            self.role == ROLE_ADMIN or self.username.lower() in always_admin_usernames()
        )

    @property
    def effective_role(self) -> str:
        return ROLE_ADMIN if self.is_admin else self.role

    @validates("username")
    def username_validator(self, key: str, value: str) -> str:
        if not USERNAME_PATTERN.fullmatch(value):
            raise UserError.REGISTER_INVALID_USERNAME()
        return value

    @validates("password")
    def password_validator(self, key: str, value: str) -> str:
        if not PASSWORD_PATTERN.fullmatch(value):
            raise UserError.REGISTER_INVALID_PASSWORD()
        return bcrypt.hashpw(value.encode(), bcrypt.gensalt()).decode()

    @classmethod
    def authenticate(cls, access_token: str) -> Self:
        try:
            payload = jwt.decode(access_token, SECRET_KEY, algorithms=["HS256"])
        except jwt.PyJWTError:
            raise UserError.ACCESS_TOKEN_INVALID()
        if not (user := cls.get_by_id(int(payload["sub"]))):
            raise UserError.USER_NOT_FOUND()
        return user

    @classmethod
    def refresh(cls, refresh_token: str) -> tuple[str, str]:
        if (user_id := RefreshToken.consume(refresh_token)) is None:
            raise UserError.REFRESH_TOKEN_INVALID()
        if not (user := cls.get_by_id(user_id)):
            raise UserError.USER_NOT_FOUND()
        return user.create_tokens()

    @classmethod
    def register(cls, username: str, password: str) -> tuple[str, str]:
        try:
            user = cls.create(username=username, password=password)
        except IntegrityError:
            raise UserError.USER_ALREADY_EXISTS()
        return user.create_tokens()

    @classmethod
    def login(cls, username: str, password: str) -> tuple[str, str]:
        if not (user := cls.get_by_key(username=username)):
            raise UserError.LOGIN_INVALID_USERNAME()
        if not bcrypt.checkpw(password.encode()[:72], user.password.encode()):
            raise UserError.LOGIN_INVALID_PASSWORD()
        return user.create_tokens()

    @classmethod
    def logout(cls, refresh_token: str) -> None:
        RefreshToken.revoke(refresh_token)
