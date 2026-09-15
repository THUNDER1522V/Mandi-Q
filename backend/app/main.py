"""MANDIQ APMC FairProcure Platform — Production Backend Application.
Provides high-performance REST APIs for agricultural procurement, token issuance,
cryptographic QR verification, fairness enforcement, and supervisor override workflows.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.procurement import start_procurement_api
from app.api.router import api_router
from app.core.config import settings
from app.database.session import get_db
from app.middleware.logging_middleware import RequestLoggingMiddleware
from app.middleware.security import RateLimitMiddleware, SecurityHeadersMiddleware

# Configure structured logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("mandiq.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle manager."""
    logger.info(
        "MANDIQ APMC Platform starting up (env=%s, log_level=%s). Routes mounted under /api/v1.",
        settings.APP_ENV,
        settings.LOG_LEVEL,
    )
    yield
    logger.info("MANDIQ APMC Platform shutting down gracefully.")


# OpenAPI Tag Metadata for Swagger UI
TAGS_METADATA = [
    {
        "name": "System",
        "description": "System health monitoring, configuration, and status endpoints.",
    },
    {
        "name": "FairProcure Operations",
        "description": "Unified live operations dashboard, intake status, and live procurement metrics.",
    },
    {
        "name": "FairProcure QR Identity",
        "description": "Cryptographic HMAC-SHA256 QR token generation, verification, and revocation.",
    },
    {
        "name": "FairProcure Enforcement",
        "description": "Active procurement governance engine enforcing strict slot timing and FIFO rules.",
    },
    {
        "name": "FairProcure Overrides",
        "description": "Emergency exception management, supervisor PIN verification, and dual-authorization audits.",
    },
    {
        "name": "FairProcure Analytics",
        "description": "Real-time mandi fairness metrics, slot adherence rates, and anomaly detection.",
    },
    {
        "name": "Farmers",
        "description": "Farmer identity lifecycle, registration, KYC attributes, and landholding records.",
    },
    {
        "name": "Bookings",
        "description": "Advance procurement appointment scheduling, crop allocations, and slot commitments.",
    },
    {
        "name": "Queue",
        "description": "Physical yard queue management, vehicle ingress registration, and priority queue ordering.",
    },
    {
        "name": "Weighbridge",
        "description": "Digital weighbridge gross/tare recording, net weight calculation, and produce inspection.",
    },
    {
        "name": "Activity Logs",
        "description": "Immutable security and operational event audit trails.",
    },
]

# FastAPI Application Factory
app = FastAPI(
    title="MANDIQ APMC FairProcure Platform API",
    version="1.0.0",
    description="""
# MANDIQ APMC FairProcure Platform API

Production REST API for transparent, slot-governed agricultural procurement.

### Key Capabilities:
- **HMAC-SHA256 QR Tokens**: Tamper-proof digital tokens tied to scheduled booking slots.
- **FairProcure Active Enforcement**: Prevents queue jumping, early entry, and duplicate weighments.
- **Supervisor Dual-Authorization**: Controlled emergency override system with immutable audit logs.
- **Live Yard Operations**: Real-time queue telemetry, weighbridge throughput, and fairness scoring.
    """,
    openapi_tags=TAGS_METADATA,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------
# Middleware Pipeline
# ---------------------------------------------------------------------
# 1. Security Headers (OWASP standards)
app.add_middleware(SecurityHeadersMiddleware)

# 2. Rate Limiting (Abuse prevention on sensitive endpoints)
app.add_middleware(
    RateLimitMiddleware,
    default_limit=300,
    sensitive_limit=60,
    window_seconds=60,
)

# 3. Request Latency & Access Logging
app.add_middleware(RequestLoggingMiddleware)

# 4. Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------
# Centralized Production Error Handlers
# ---------------------------------------------------------------------
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Standardized HTTP exception response maintaining backward compatibility."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": str(exc.detail),
                "status_code": exc.status_code,
                "path": request.url.path,
            },
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Standardized validation error handler."""
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters or payload",
                "details": exc.errors(),
                "path": request.url.path,
            },
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all unhandled exception handler ensuring clean failure without internal trace leakage."""
    logger.error("Unhandled exception processing %s: %s", request.url.path, str(exc), exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected internal server error occurred.",
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected internal server error occurred. Please contact APMC operations support.",
                "path": request.url.path,
            },
        },
    )


# ---------------------------------------------------------------------
# Router Mounts
# ---------------------------------------------------------------------
app.include_router(api_router)

# Direct root alias for backward-compatible clients
app.add_api_route(
    "/procurement/start",
    start_procurement_api,
    methods=["POST"],
    tags=["FairProcure Enforcement"],
    summary="Direct root alias: Start procurement",
)


# ---------------------------------------------------------------------
# System Health & Root Endpoints
# ---------------------------------------------------------------------
@app.get("/", tags=["System"], summary="Root service status")
def root() -> Dict[str, Any]:
    """Root metadata and platform status."""
    return {
        "message": "MANDIQ APMC FairProcure Backend Running",
        "status": "success",
        "version": "1.0.0",
        "environment": settings.APP_ENV,
        "docs": "/docs",
    }


@app.get("/health", tags=["System"], summary="Comprehensive health check")
def health(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Production health check verifying application lifecycle and database connectivity."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        logger.error("Health check failed database connectivity: %s", exc)
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "service": "mandiq-backend",
                "environment": settings.APP_ENV,
                "database": "disconnected",
                "error": str(exc),
            },
        )

    return {
        "status": "ok",
        "service": "mandiq-backend",
        "environment": settings.APP_ENV,
        "database": db_status,
        "version": "1.0.0",
    }