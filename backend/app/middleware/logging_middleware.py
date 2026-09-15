"""Request logging and performance timing middleware.
Measures request latency, attaches X-Process-Time header, and emits structured logs.
"""
from __future__ import annotations

import logging
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("mandiq.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs incoming HTTP requests with latency, status codes, and path metadata."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()
        client_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "unknown")
        
        try:
            response: Response = await call_next(request)
            process_time = (time.perf_counter() - start_time) * 1000  # in ms
            response.headers["X-Process-Time"] = f"{process_time:.2f}ms"

            # Filter noisy health checks from clogging info logs in production
            if request.url.path not in ("/health", "/favicon.ico"):
                logger.info(
                    "%s %s %s - Status: %d - Latency: %.2fms - IP: %s",
                    request.method,
                    request.url.path,
                    request.scope.get("http_version", "1.1"),
                    response.status_code,
                    process_time,
                    client_ip,
                )
            return response
        except Exception as exc:
            process_time = (time.perf_counter() - start_time) * 1000
            logger.error(
                "Unhandled error processing %s %s from %s after %.2fms: %s",
                request.method,
                request.url.path,
                client_ip,
                process_time,
                str(exc),
                exc_info=True,
            )
            raise exc
