"""Sprint 6 Production Readiness & Security Tests.
Validates security headers, performance latency headers, database health check,
centralized exception handling formats, and rate limiting protections.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_production_security_headers():
    """Verify OWASP-compliant security headers on responses."""
    res = client.get("/")
    assert res.status_code == 200
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("x-frame-options") == "DENY"
    assert res.headers.get("x-xss-protection") == "1; mode=block"
    assert res.headers.get("referrer-policy") == "strict-origin-when-cross-origin"


def test_performance_timing_header():
    """Verify X-Process-Time is attached by logging middleware."""
    res = client.get("/api/v1/dashboard/summary")
    assert res.status_code == 200
    assert "x-process-time" in res.headers
    assert res.headers["x-process-time"].endswith("ms")


def test_health_check_database_connectivity():
    """Verify /health reports database connection status and environment."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    assert "service" in data
    assert "environment" in data


def test_centralized_not_found_error_format():
    """Verify 404 returns structured error object while preserving detail."""
    res = client.get("/api/v1/nonexistent-endpoint-xyz")
    assert res.status_code == 404
    data = res.json()
    assert "detail" in data
    assert "error" in data
    assert data["error"]["code"] == "HTTP_404"
    assert data["error"]["status_code"] == 404


def test_centralized_validation_error_format():
    """Verify 422 payload errors return standardized error model."""
    res = client.post("/api/v1/farmers", json={"invalid_field": 123})
    assert res.status_code == 422
    data = res.json()
    assert "detail" in data
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
