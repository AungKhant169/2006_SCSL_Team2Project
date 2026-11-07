from types import SimpleNamespace

import pytest
from fastapi import Request, status

from core import rate_limit, roadmap_ai
from core.rate_limit import (
    RateLimiter,
    RateLimitError,
    ai_limiter,
    client_ip,
    login_limiter,
)
from core.settings import settings
from models.user import UserError
from tests.conftest import USER, client

WRONG = {**USER, "password": "wrong123!"}
OTHER = {"username": "bob", "password": "pass123!"}
PAYLOAD = {"stage": "secondary", "postal": "556000"}


@pytest.fixture
def clock(monkeypatch) -> SimpleNamespace:
    """Replace the limiter's clock with one that only moves when a test moves it."""
    now = SimpleNamespace(seconds=1000.0)
    monkeypatch.setattr(rate_limit, "monotonic", lambda: now.seconds)
    return now


@pytest.fixture
def proxied(monkeypatch):
    """Trust the last X-Forwarded-For entry, as if the server sits behind one proxy."""
    monkeypatch.setattr(settings, "trusted_proxy_hops", 1)


def error(response):
    body = response.status_code, response.json()["detail"]
    return next((e for e in [*RateLimitError, *UserError] if e.value == body), None)


def login(credentials=WRONG, ip=None):
    headers = {"X-Forwarded-For": ip} if ip else {}
    return client.post("/user/login", json=credentials, headers=headers)


def generate(tokens, payload=PAYLOAD, kind="ai"):
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    return client.post(
        f"/roadmap/generate-{kind}-roadmap", json=payload, headers=headers
    )


def request(peer, forwarded=None):
    headers = [(b"x-forwarded-for", forwarded.encode())] if forwarded else []
    return Request({"type": "http", "headers": headers, "client": (peer, 1234)})


class TestRateLimiter:
    def test_limit_per_key(self, clock):
        limiter = RateLimiter(2, 60)
        assert [limiter.exceeded("a") for _ in range(3)] == [False, False, True]
        assert not limiter.exceeded("b")

    def test_sliding_window(self, clock):
        limiter = RateLimiter(2, 60)
        assert not limiter.exceeded("key")
        clock.seconds += 40
        assert not limiter.exceeded("key")
        # Only the first hit has aged out, so one more is allowed.
        clock.seconds += 20
        assert not limiter.exceeded("key")
        assert limiter.exceeded("key")

    def test_refused_hits_not_counted(self, clock):
        limiter = RateLimiter(1, 60)
        assert not limiter.exceeded("key")
        for _ in range(59):
            clock.seconds += 1
            assert limiter.exceeded("key")
        clock.seconds += 1
        assert not limiter.exceeded("key")

    def test_sweeps_quiet_keys(self, clock):
        limiter = RateLimiter(1, 60)
        for n in range(100):
            limiter.exceeded(n)
        clock.seconds += 61
        limiter.exceeded("new")
        assert list(limiter._hits) == ["new"]


class TestClientIp:
    @pytest.mark.parametrize(
        ("hops", "forwarded", "expected"),
        [
            pytest.param(0, "6.6.6.6", "10.0.0.1", id="no-proxy"),
            pytest.param(1, "6.6.6.6, 7.7.7.7, 203.0.113.9", "203.0.113.9", id="one"),
            pytest.param(
                2, "6.6.6.6, 203.0.113.9, 198.51.100.1", "203.0.113.9", id="two"
            ),
            pytest.param(2, "6.6.6.6", "10.0.0.1", id="too-few"),
            pytest.param(2, None, "10.0.0.1", id="no-header"),
        ],
    )
    def test_trusted_hops(self, monkeypatch, hops, forwarded, expected):
        monkeypatch.setattr(settings, "trusted_proxy_hops", hops)
        assert client_ip(request("10.0.0.1", forwarded)) == expected


class TestLoginLimit:
    @staticmethod
    def use_up(ip=None):
        for _ in range(login_limiter.limit):
            response = login(ip=ip)
            assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_invalid_password(self, authenticated):
        self.use_up()
        assert error(login()) == RateLimitError.LOGIN_RATE_LIMITED

    def test_invalid_username(self):
        for _ in range(login_limiter.limit):
            assert error(login()) == UserError.LOGIN_INVALID_USERNAME
        assert error(login()) == RateLimitError.LOGIN_RATE_LIMITED

    def test_successes_count(self, authenticated):
        for _ in range(login_limiter.limit):
            assert login(USER).status_code == status.HTTP_200_OK
        assert error(login(USER)) == RateLimitError.LOGIN_RATE_LIMITED

    def test_username_case(self, authenticated):
        self.use_up()
        credentials = {**WRONG, "username": USER["username"].upper()}
        assert error(login(credentials)) == RateLimitError.LOGIN_RATE_LIMITED

    def test_expires(self, authenticated, clock):
        self.use_up()
        assert error(login(USER)) == RateLimitError.LOGIN_RATE_LIMITED
        clock.seconds += login_limiter.window + 1
        assert login(USER).status_code == status.HTTP_200_OK

    def test_other_user(self, authenticated):
        self.use_up()
        client.post("/user/register", json=OTHER)
        assert login(OTHER).status_code == status.HTTP_200_OK

    def test_other_address(self, authenticated, proxied):
        # An attacker elsewhere cannot lock the user out.
        self.use_up("6.6.6.6")
        assert error(login(ip="6.6.6.6")) == RateLimitError.LOGIN_RATE_LIMITED
        assert login(USER, "203.0.113.9").status_code == status.HTTP_200_OK

    def test_spoofed_address(self, authenticated, proxied):
        # Only the entry our proxy appended is used, whatever the client sends before it.
        for n in range(login_limiter.limit):
            response = login(ip=f"10.0.0.{n}, 203.0.113.9")
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
        response = login(ip="10.0.1.1, 203.0.113.9")
        assert error(response) == RateLimitError.LOGIN_RATE_LIMITED


class TestAiLimit:
    @pytest.fixture
    def calls(self, monkeypatch) -> list[str]:
        """Record the requests that get past the limit, and stop them before OpenAI."""
        calls = []

        def candidate_pool(stage):
            calls.append(stage)
            return {}

        monkeypatch.setattr(roadmap_ai, "candidate_pool", candidate_pool)
        return calls

    @staticmethod
    def use_up(tokens):
        for _ in range(ai_limiter.limit):
            assert generate(tokens).status_code == status.HTTP_200_OK

    def test_exceeded(self, authenticated, calls):
        self.use_up(authenticated.tokens)
        assert error(generate(authenticated.tokens)) == RateLimitError.AI_RATE_LIMITED
        assert len(calls) == ai_limiter.limit

    def test_other_user(self, authenticated, calls):
        self.use_up(authenticated.tokens)
        tokens = client.post("/user/register", json=OTHER).json()
        assert generate(tokens).status_code == status.HTTP_200_OK

    def test_expires(self, authenticated, calls, clock):
        self.use_up(authenticated.tokens)
        assert error(generate(authenticated.tokens)) == RateLimitError.AI_RATE_LIMITED
        clock.seconds += ai_limiter.window + 1
        assert generate(authenticated.tokens).status_code == status.HTTP_200_OK

    def test_invalid_not_counted(self, authenticated, calls):
        payload = {**PAYLOAD, "postal": "nope"}
        for _ in range(ai_limiter.limit + 1):
            response = generate(authenticated.tokens, payload)
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
        assert generate(authenticated.tokens).status_code == status.HTTP_200_OK

    def test_rule_not_limited(self, authenticated):
        for _ in range(ai_limiter.limit + 1):
            response = generate(authenticated.tokens, kind="rule")
            assert response.status_code == status.HTTP_200_OK
