import pytest
from fastapi import status

from models.user import UserError
from tests.conftest import USER, client


def error(response):
    body = response.status_code, response.json()["detail"]
    return next((e for e in UserError if e.args == body), None)


def identity(access_token):
    headers = {"Authorization": f"Bearer {access_token}"}
    return client.get("/user/identity", headers=headers)


class TestRefresh:
    def test_success(self, authenticated):
        response = client.post("/user/refresh", json=authenticated.tokens)
        assert response.json()["refresh_token"] != authenticated.tokens["refresh_token"]

    def test_invalid(self, authenticated):
        client.post("/user/refresh", json=authenticated.tokens)
        response = client.post("/user/refresh", json=authenticated.tokens)
        assert error(response) == UserError.REFRESH_TOKEN_INVALID


class TestRegister:
    def test_duplicate_registration(self, authenticated):
        response = client.post("/user/register", json=USER)
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
