from datetime import timedelta

import pytest
from fastapi import status
from sqlalchemy import select

from models.base import SessionLocal, engine, utc_now
from models.refresh_token import REFRESH_TOKEN_LIFETIME, RefreshToken
from models.user import User, UserError
from tests.conftest import USER, client


def error(response):
    body = response.status_code, response.json()["detail"]
    return next((e for e in UserError if e.value == body), None)


def identity(access_token):
    headers = {"Authorization": f"Bearer {access_token}"}
    return client.get("/user/identity", headers=headers)


class TestIdentity:
    def test_user_role(self, authenticated):
        response = identity(authenticated.tokens["access_token"])
        assert response.json()["role"] == "user"

    def test_admin_role(self, admin):
        response = identity(admin.tokens["access_token"])
        assert response.json()["role"] == "admin"


class TestRefresh:
    def test_success(self, authenticated):
        response = client.post("/user/refresh", json=authenticated.tokens)
        assert response.json()["refresh_token"] != authenticated.tokens["refresh_token"]

    def test_invalid(self, authenticated):
        client.post("/user/refresh", json=authenticated.tokens)
        response = client.post("/user/refresh", json=authenticated.tokens)
        assert error(response) == UserError.REFRESH_TOKEN_INVALID

    def test_unknown(self, authenticated):
        tokens = {**authenticated.tokens, "refresh_token": "never-issued"}
        response = client.post("/user/refresh", json=tokens)
        assert error(response) == UserError.REFRESH_TOKEN_INVALID

    def test_renewed_tokens_work(self, authenticated):
        renewed = client.post("/user/refresh", json=authenticated.tokens).json()
        assert identity(renewed["access_token"]).status_code == status.HTTP_200_OK
        assert (
            client.post("/user/refresh", json=renewed).status_code == status.HTTP_200_OK
        )

    def test_survives_server_state_loss(self, authenticated):
        # A restarted server has no memory of earlier requests; only the database remains.
        engine.dispose()
        response = client.post("/user/refresh", json=authenticated.tokens)
        assert response.status_code == status.HTTP_200_OK

    def test_stores_only_a_digest(self, authenticated):
        with SessionLocal() as session:
            stored = session.scalars(select(RefreshToken.token_hash)).all()
        assert stored
        assert authenticated.tokens["refresh_token"] not in stored

    def test_expired(self, authenticated, monkeypatch):
        later = utc_now() + REFRESH_TOKEN_LIFETIME + timedelta(seconds=1)
        monkeypatch.setattr("models.refresh_token.utc_now", lambda: later)
        response = client.post("/user/refresh", json=authenticated.tokens)
        assert error(response) == UserError.REFRESH_TOKEN_INVALID

    def test_expired_tokens_are_discarded(self, authenticated, monkeypatch):
        later = utc_now() + REFRESH_TOKEN_LIFETIME + timedelta(seconds=1)
        monkeypatch.setattr("models.refresh_token.utc_now", lambda: later)
        RefreshToken.issue(authenticated.user.id)
        with SessionLocal() as session:
            assert len(session.scalars(select(RefreshToken)).all()) == 1

    def test_deleted_user(self, authenticated):
        User.delete(authenticated.user.id)
        response = client.post("/user/refresh", json=authenticated.tokens)
        assert error(response) == UserError.USER_NOT_FOUND


class TestRegister:
    def test_duplicate_registration(self, authenticated):
        response = client.post("/user/register", json=USER)
        assert error(response) == UserError.USER_ALREADY_EXISTS

    def test_duplicate_ignoring_case(self, authenticated):
        credentials = {**USER, "username": USER["username"].upper()}
        response = client.post("/user/register", json=credentials)
        assert error(response) == UserError.USER_ALREADY_EXISTS

    @pytest.mark.parametrize(
        "username",
        [
            # Symbol Constraints
            pytest.param("usern@me", id="has-symbol"),
            pytest.param("ünïcode", id="has-unicode"),
            pytest.param("a b", id="has-whitespace"),
            # Length Constraints
            pytest.param("", id="too-short"),
            pytest.param("x" * 37, id="too-long"),
        ],
    )
    def test_username_validator(self, username):
        credentials = {"username": username, "password": USER["password"]}
        response = client.post("/user/register", json=credentials)
        assert error(response) == UserError.REGISTER_INVALID_USERNAME

    @pytest.mark.parametrize(
        "password",
        [
            # Symbol Constraints
            pytest.param("password!", id="no-number"),
            pytest.param("password1", id="no-symbol"),
            # Length Constraints
            pytest.param("short1!", id="too-short"),
            pytest.param("x" * 35 + "1!", id="too-long"),
        ],
    )
    def test_password_validator(self, password):
        credentials = {"username": USER["username"], "password": password}
        response = client.post("/user/register", json=credentials)
        assert error(response) == UserError.REGISTER_INVALID_PASSWORD


class TestLogin:
    def test_success(self, authenticated):
        response = client.post("/user/login", json=USER)
        response = identity(response.json()["access_token"])
        assert response.json()["id"] == authenticated.user.id

    def test_invalid_username(self, authenticated):
        credentials = {"username": "bob", "password": USER["password"]}
        response = client.post("/user/login", json=credentials)
        assert error(response) == UserError.LOGIN_INVALID_USERNAME

    def test_invalid_password(self, authenticated):
        credentials = {"username": USER["username"], "password": "wrong123!"}
        response = client.post("/user/login", json=credentials)
        assert error(response) == UserError.LOGIN_INVALID_PASSWORD


class TestLogout:
    def test_success(self, authenticated):
        response = client.post("/user/logout", json=authenticated.tokens)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        response = client.post("/user/refresh", json=authenticated.tokens)
        assert error(response) == UserError.REFRESH_TOKEN_INVALID

    def test_invalid(self, authenticated):
        response = client.post("/user/logout", json=authenticated.tokens)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        response = client.post("/user/logout", json=authenticated.tokens)
        assert response.status_code == status.HTTP_204_NO_CONTENT
