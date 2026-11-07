from collections.abc import Hashable
from hashlib import sha256
from threading import Lock
from time import monotonic

from fastapi import Request, status

from core.exceptions import BaseError
from core.settings import settings


class RateLimitError(BaseError):
    AI_RATE_LIMITED = (
        status.HTTP_429_TOO_MANY_REQUESTS,
        "You have generated too many AI recommendations. Please wait a few minutes and try again.",
    )
    LOGIN_RATE_LIMITED = (
        status.HTTP_429_TOO_MANY_REQUESTS,
        "Too many login attempts. Please wait a few minutes and try again.",
    )


class RateLimiter:
    """
    This class allows `limit` hits per key in a sliding window of `window` seconds.
    All hits are kept only in memory, and refused hits are not counted.
    """

    def __init__(self, limit: int, window: float):
        self.limit = limit
        self.window = window
        self._hits: dict[Hashable, list[float]] = {}
        self._lock = Lock()
        self._sweep = 0.0

    def clear(self) -> None:
        with self._lock:
            self._hits.clear()

    def exceeded(self, key: Hashable) -> bool:
        """
        This method checks if a key has exceeded its allocated limit.
        Each allowed call of this function counts as one hit.
        """
        now = monotonic()
        cutoff = now - self.window

        with self._lock:
            # Stop random keys from growing memory usage indefinitely.
            if now >= self._sweep:
                self._hits = {k: v for k, v in self._hits.items() if v[-1] > cutoff}
                self._sweep = now + self.window

            hits = [t for t in self._hits.get(key, []) if t > cutoff]
            if len(hits) >= self.limit:
                return True

            self._hits[key] = [*hits, now]
            return False


ai_limiter = RateLimiter(settings.ai_rate_limit, settings.ai_rate_window)
login_limiter = RateLimiter(settings.login_rate_limit, settings.login_rate_window)


def client_ip(request: Request) -> str:
    """
    This function returns the address seen by the nearest trusted proxy.
    Omits X-Forwarded-For entries before the last TRUSTED_PROXY_HOPS.
    """
    forwarded = request.headers.get("x-forwarded-for", "").replace(",", " ").split()

    if (hops := settings.trusted_proxy_hops) and len(forwarded) >= hops:
        return forwarded[-hops]

    return request.client.host if request.client else "unknown"


def login_key(username: str, request: Request) -> tuple[bytes, str]:
    """This function keys login attempts by username and address."""
    return sha256(username.lower().encode()).digest(), client_ip(request)
