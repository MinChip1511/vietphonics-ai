"""Small in-memory rate limiter (sliding window), enough for one API process.

State lives in the process, so it resets on restart and is not shared between instances: fine for the
single Render instance this runs on; use Redis (or the platform's limiter) before running several.
"""
import threading
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request

from .security import current_account


class RateLimiter:
    def __init__(self, max_calls: int, per_seconds: float):
        self.max_calls = max_calls
        self.per_seconds = per_seconds
        self._hits = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] > self.per_seconds:
                hits.popleft()
            if len(hits) >= self.max_calls:
                return False
            hits.append(now)
            if len(self._hits) > 10_000:  # drop idle keys so the table cannot grow without bound
                for k in [k for k, v in self._hits.items() if not v or now - v[-1] > self.per_seconds]:
                    del self._hits[k]
            return True


LIMITERS = {}


def _limiter(name, max_calls, per_seconds):
    return LIMITERS.setdefault(name, RateLimiter(max_calls, per_seconds))


def allow_key(name, key, max_calls, per_seconds) -> bool:
    """One call against a named limit for an arbitrary key (e.g. an email address)."""
    return _limiter(name, max_calls, per_seconds).allow(key)


def client_ip(request: Request) -> str:
    # Uvicorn (--proxy-headers) has already replaced the peer with the forwarded client address.
    return request.client.host if request.client else "unknown"


def _too_many():
    return HTTPException(status_code=429, detail="Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.")


def limit_by_ip(name, max_calls, per_seconds):
    limiter = _limiter(name, max_calls, per_seconds)

    def dependency(request: Request):
        if not limiter.allow(client_ip(request)):
            raise _too_many()

    return Depends(dependency)


def limit_by_account(name, max_calls, per_seconds):
    limiter = _limiter(name, max_calls, per_seconds)

    def dependency(account: dict = Depends(current_account)):
        if not limiter.allow(account["id"]):
            raise _too_many()
        return account

    return Depends(dependency)
