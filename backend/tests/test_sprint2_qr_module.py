"""Comprehensive test suite for Sprint 2: FairProcure QR Identity & Verification Module.
Tests:
1. QR Generation
2. QR Download (PNG, SVG, JSON)
3. QR Verification (Valid signature & active booking)
4. Tampered QR Payload
5. Wrong / Forged Signature
6. Expired QR Token
7. Inactive / Revoked QR Token
8. QR Regeneration & Version Incrementing
9. Concurrent Verification Scans
10. Dashboard Telemetry Metrics
"""
import concurrent.futures
import json
import uuid
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.core.enums.fairprocure import QRStatus, RuleDecision
from app.database.session import SessionLocal
from app.main import app
from app.models.bookings import Booking
from app.models.farmer import Farmer
from app.models.qr_token import QRToken

client = TestClient(app)


@pytest.fixture
def test_farmer_fixture():
    """Provides an isolated test farmer with a confirmed booking slot."""
    db = SessionLocal()
    farmer = Farmer(
        farmer_name="Sardar Gurmeet Singh",
        phone_number=f"+9198{uuid.uuid4().hex[:8]}",
        village="Taraori, Karnal",
        district="Karnal",
        state="Haryana",
        preferred_language="Hindi",
    )
    db.add(farmer)
    db.commit()
    db.refresh(farmer)

    # Add booking for farmer
    booking = Booking(
        farmer_id=farmer.id,
        commodity_id=uuid.UUID("a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d") if False else None,
        booking_date=datetime.utcnow(),
        booking_slot="10:00 AM - 12:00 PM",
        estimated_quantity=60,
        status="WAITING",
    )
    # Fetch an existing commodity
    from app.models.commodity import Commodity
    com = db.query(Commodity).first()
    if com:
        booking.commodity_id = com.id
        db.add(booking)
        db.commit()
        db.refresh(booking)

    yield farmer, booking

    # Cleanup
    db.query(QRToken).filter(QRToken.farmer_id == farmer.id).delete()
    if booking and booking.id:
        db.query(Booking).filter(Booking.id == booking.id).delete()
    db.query(Farmer).filter(Farmer.id == farmer.id).delete()
    db.commit()
    db.close()


def test_qr_generation(test_farmer_fixture):
    farmer, _ = test_farmer_fixture
    res = client.post(f"/api/v1/qr/generate/{farmer.id}")
    assert res.status_code == 201
    data = res.json()
    assert data["farmer_id"] == str(farmer.id)
    assert data["version"] == 1
    assert data["is_active"] is True
    assert data["status"] == "active"
    assert "signature" in data["payload"]
    assert data["payload"]["signature"] != ""


def test_qr_download_formats(test_farmer_fixture):
    farmer, _ = test_farmer_fixture
    # 1. JSON Format
    res_json = client.get(f"/api/v1/qr/{farmer.id}?format=json")
    assert res_json.status_code == 200
    assert "payload" in res_json.json()

    # 2. PNG Format
    res_png = client.get(f"/api/v1/qr/{farmer.id}?format=png")
    assert res_png.status_code == 200
    assert res_png.headers["content-type"] == "image/png"
    # Verify PNG Magic Bytes (\x89PNG\r\n\x1a\n)
    assert res_png.content[:8] == b"\x89PNG\r\n\x1a\n"

    # 3. SVG Format
    res_svg = client.get(f"/api/v1/qr/{farmer.id}?format=svg")
    assert res_svg.status_code == 200
    assert "image/svg+xml" in res_svg.headers["content-type"]
    svg_text = res_svg.text
    assert "<svg" in svg_text
    assert "</svg>" in svg_text


def test_qr_verification_valid(test_farmer_fixture):
    farmer, _ = test_farmer_fixture
    gen_res = client.post(f"/api/v1/qr/generate/{farmer.id}")
    payload = gen_res.json()["payload"]

    verify_res = client.post(
        "/api/v1/qr/verify",
        json={
            "qr_data": json.dumps(payload),
            "device_id": "GATE-BARRIER-01",
            "operator_id": "OFFICER-HARPREET",
        },
    )
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert data["valid"] is True
    assert data["status"] == "VALID"
    assert data["rule_decision"] in (RuleDecision.ALLOW.value, RuleDecision.OVERRIDE_REQUIRED.value)
    assert data["farmer"]["name"] == farmer.farmer_name
    assert data["device_id"] == "GATE-BARRIER-01"


def test_tampered_qr_payload(test_farmer_fixture):
    farmer, _ = test_farmer_fixture
    gen_res = client.post(f"/api/v1/qr/generate/{farmer.id}")
    payload = gen_res.json()["payload"]

    # Tamper with slot_start without re-signing
    payload["slot_start"] = "06:00 AM"

    verify_res = client.post(
        "/api/v1/qr/verify",
        json={"qr_data": json.dumps(payload)},
    )
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert data["valid"] is False
    assert data["status"] == "INVALID_SIGNATURE"
    assert "tamper" in data["message"].lower() or "signature" in data["message"].lower()


def test_wrong_signature(test_farmer_fixture):
    farmer, _ = test_farmer_fixture
    gen_res = client.post(f"/api/v1/qr/generate/{farmer.id}")
    payload = gen_res.json()["payload"]

    # Supply garbage signature
    payload["signature"] = "deadbeef1234567890abcdefdeadbeef1234567890abcdefdeadbeef12345678"

    verify_res = client.post(
        "/api/v1/qr/verify",
        json={"qr_data": json.dumps(payload)},
    )
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert data["valid"] is False
    assert data["status"] == "INVALID_SIGNATURE"


def test_expired_qr(test_farmer_fixture):
    farmer, _ = test_farmer_fixture
    gen_res = client.post(f"/api/v1/qr/generate/{farmer.id}")
    payload = gen_res.json()["payload"]

    # Manually expire the token in database
    db = SessionLocal()
    token = db.query(QRToken).filter(QRToken.farmer_id == farmer.id, QRToken.is_active.is_(True)).first()
    token.expires_at = datetime.utcnow() - timedelta(days=2)
    db.commit()
    db.close()

    verify_res = client.post(
        "/api/v1/qr/verify",
        json={"qr_data": json.dumps(payload)},
    )
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert data["valid"] is False
    assert data["status"] == "EXPIRED"
    assert "expired" in data["message"].lower()


def test_inactive_revoked_qr(test_farmer_fixture):
    farmer, _ = test_farmer_fixture
    gen_res = client.post(f"/api/v1/qr/generate/{farmer.id}")
    payload = gen_res.json()["payload"]

    # Revoke QR
    revoke_res = client.post(f"/api/v1/qr/revoke/{farmer.id}?reason=Stolen+Card")
    assert revoke_res.status_code == 200
    assert revoke_res.json()["success"] is True

    # Attempt to verify revoked QR
    verify_res = client.post(
        "/api/v1/qr/verify",
        json={"qr_data": json.dumps(payload)},
    )
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert data["valid"] is False
    assert data["status"] == "REVOKED"


def test_qr_regeneration_versioning(test_farmer_fixture):
    farmer, _ = test_farmer_fixture
    # Version 1
    v1_res = client.post(f"/api/v1/qr/generate/{farmer.id}")
    v1_payload = v1_res.json()["payload"]
    assert v1_res.json()["version"] == 1

    # Regenerate to Version 2
    regen_res = client.post(
        f"/api/v1/qr/regenerate/{farmer.id}",
        json={"reason": "Card damaged in rain", "operator_id": "SUP-901"},
    )
    assert regen_res.status_code == 200
    v2_data = regen_res.json()
    assert v2_data["version"] == 2
    assert v2_data["is_active"] is True
    v2_payload = v2_data["payload"]

    # Verifying old Version 1 should now be rejected as revoked
    old_verify = client.post(
        "/api/v1/qr/verify",
        json={"qr_data": json.dumps(v1_payload)},
    )
    assert old_verify.json()["valid"] is False
    assert old_verify.json()["status"] == "REVOKED"

    # Verifying new Version 2 should succeed
    new_verify = client.post(
        "/api/v1/qr/verify",
        json={"qr_data": json.dumps(v2_payload)},
    )
    assert new_verify.json()["valid"] is True
    assert new_verify.json()["status"] == "VALID"


def test_concurrent_verification(test_farmer_fixture):
    farmer, _ = test_farmer_fixture
    gen_res = client.post(f"/api/v1/qr/generate/{farmer.id}")
    payload = gen_res.json()["payload"]

    def perform_scan(scanner_idx):
        test_client = TestClient(app)
        return test_client.post(
            "/api/v1/qr/verify",
            json={
                "qr_data": json.dumps(payload),
                "device_id": f"GATE-BARRIER-{scanner_idx:02d}",
                "operator_id": f"OP-{scanner_idx:02d}",
            },
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(perform_scan, i) for i in range(5)]
        results = [f.result() for f in futures]

    for r in results:
        assert r.status_code == 200
        assert r.json()["valid"] is True

    # Check that verification count incremented accurately
    db = SessionLocal()
    token = db.query(QRToken).filter(QRToken.farmer_id == farmer.id, QRToken.is_active.is_(True)).first()
    assert token.verification_count >= 5
    db.close()


def test_dashboard_metrics(test_farmer_fixture):
    farmer, _ = test_farmer_fixture
    client.post(f"/api/v1/qr/generate/{farmer.id}")

    # 1. Main endpoint
    res = client.get("/api/v1/qr/dashboard/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "today_qr_generated" in data
    assert "today_qr_verified" in data
    assert "verification_failures" in data
    assert "active_qr" in data
    assert "verification_success_rate" in data
    assert data["active_qr"] > 0

    # 2. Direct alias under /dashboard/qr-metrics
    alias_res = client.get("/api/v1/dashboard/qr-metrics")
    assert alias_res.status_code == 200
    assert alias_res.json()["active_qr"] == data["active_qr"]
