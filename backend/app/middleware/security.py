"""Security middleware for production hardening.
Provides security headers injection and rate-limiting protection for sensitive endpoints.
"""
from __future__ import annotations

import time
import logging
from collections import defaultdict
from typing import Dict, List, Tuple
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger("mandiq.security")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Injects production-grade OWASP security headers into all responses."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Prevent clickjacking / frame embedding
        response.headers["X-Frame-Options"] = "DENY"
        
        # Cross-Site Scripting filter
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Strict Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Restrict browser feature permissions
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        
        # Content Security Policy (allows Swagger UI inline styles & scripts while securing API)
        if not request.url.path.startswith(("/docs", "/redoc", "/openapi.json")):
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; "
                "connect-src 'self' ws: wss:;"
            )
            
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """In-memory sliding window rate limiter for abuse prevention on sensitive endpoints."""

    def __init__(
        self,
        app,
        default_limit: int = 240,  # 240 requests per minute
        sensitive_limit: int = 60,  # 60 requests per minute on sensitive endpoints
        window_seconds: int = 60,
    ) -> None:
        super().__init__(app)
        self.default_limit = default_limit
        self.sensitive_limit = sensitive_limit
        self.window_seconds = window_seconds
        self.records: Dict[str, List[float]] = defaultdict(list)
        
        self.sensitive_prefixes: Tuple[str, ...] = (
            "/api/v1/qr/verify",
            "/api/v1/fairprocure/override/approve",
            "/api/v1/fairprocure/override/reject",
            "/procurement/start",
        )

    def _get_client_ip(self, request: Request) -> str:
        # Check standard reverse proxy headers
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        return request.client.host if request.client else "127.0.0.1"

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip rate limiting for static assets and documentation
        path = request.url.path
        if path.startswith(("/docs", "/redoc", "/openapi.json", "/health", "/favicon.ico")):
            return await call_next(request)

        client_ip = self._get_client_ip(request)
        now = time.time()
        cutoff = now - self.window_seconds

        # Determine limit for path
        is_sensitive = any(path.startswith(prefix) for prefix in self.sensitive_prefixes)
        limit = self.sensitive_limit if is_sensitive else self.default_limit

        key = f"{client_ip}:{path if is_sensitive else 'general'}"
        
        # Evict timestamps outside current window
        timestamps = [t for t in self.records[key] if t > cutoff]
        self.records[key] = timestamps

        if len(timestamps) >= limit:
            logger.warning(
                "Rate limit exceeded for IP %s on path %s (limit: %d/%ds)",
                client_ip,
                path,
                limit,
                self.window_seconds,
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests. Please retry after a brief pause.",
                        "details": {
                            "limit": limit,
                            "window_seconds": self.window_seconds,
                        },
                    }
                },
                headers={"Retry-After": str(self.window_seconds)},
            )

        self.records[key].append(now)
        return await call_next(request)
