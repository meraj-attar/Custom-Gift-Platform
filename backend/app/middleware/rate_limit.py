import time
from collections import defaultdict
from threading import Lock
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import settings

# Thread-safe in-memory sliding window rate limiter
_lock = Lock()
_client_history: dict[str, list[float]] = defaultdict(list)

# Rate limit rules: (path_prefix, max_requests, window_seconds)
RATE_LIMIT_RULES: list[tuple[str, int, int]] = [
    ("/api/auth/login", 15, 60),          # 15 attempts per minute
    ("/api/auth/register", 10, 60),       # 10 attempts per minute
    ("/api/auth/forgot-password", 5, 60), # 5 attempts per minute
    ("/api/auth/verify-reset-otp", 10, 60), # 10 verification attempts per minute
    ("/api/auth/resend-reset-otp", 5, 60), # 5 resend attempts per minute
    ("/api/auth/reset-password", 5, 60),  # 5 reset attempts per minute
    ("/api/auth/recovery", 5, 60),        # 5 recovery attempts per minute
    ("/api/contact", 10, 60),             # 10 contact messages per minute
]


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Allow testing environment to bypass unless explicit test header is provided
        if settings.app_env.lower() == "test" and request.headers.get("X-Test-Rate-Limit") != "true":
            return await call_next(request)

        # Only rate limit POST requests on sensitive endpoints
        if request.method.upper() != "POST":
            return await call_next(request)

        path = request.url.path
        matched_rule = None
        for prefix, max_reqs, window_sec in RATE_LIMIT_RULES:
            if path.startswith(prefix):
                matched_rule = (max_reqs, window_sec)
                break

        if not matched_rule:
            return await call_next(request)

        max_requests, window_seconds = matched_rule
        now = time.time()
        client_ip = request.client.host if request.client else "unknown"
        key = f"{client_ip}:{path}"

        with _lock:
            # Prune timestamps older than window
            cutoff = now - window_seconds
            timestamps = [t for t in _client_history[key] if t > cutoff]
            _client_history[key] = timestamps

            if len(timestamps) >= max_requests:
                oldest = timestamps[0]
                retry_after = int(window_seconds - (now - oldest)) + 1
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please try again later."},
                    headers={"Retry-After": str(max(1, retry_after))},
                )

            _client_history[key].append(now)

        return await call_next(request)
