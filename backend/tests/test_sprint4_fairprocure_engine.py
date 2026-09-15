"""Automated Test Suite for MANDIQ Sprint 4: FairProcure Enforcement Engine.
Verifies queue jumping prevention, slot timing enforcement, supervisor dual-authorization overrides,
audit logging, fairness scoring, duplicate procurement defense, QR enforcement, and lifecycle transitions.
"""
import uuid
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient

from sqlalchemy import func
from app.core.enums.fairprocure import ApprovalMethod, OverrideStatus, ProcurementStatus, RuleDecision
from app.database.session import SessionLocal
from app.main import app
from app.models.bookings import Booking
from app.models.commodity import Commodity
from app.models.farmer import Farmer
from app.models.override_request import OverrideRequest
from app.models.procurement_event import ProcurementEvent
from app.models.qr_token import QRToken
from app.models.token import Token
from app.models.weighbridge_bay import WeighbridgeBay
from app.services.fairprocure.qr_service import QRService

client = TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def test_commodity(db_session):
    comm = db_session.query(Commodity).first()
    if not comm:
        comm = Commodity(
            commodity_name="Wheat (गेहूँ)",
            variety="Sharbati",
            minimum_support_price=2275.0,
            market_rate=2400.0,
        )
        db_session.add(comm)
        db_session.commit()
        db_session.refresh(comm)
    return comm


@pytest.fixture
def test_bays(db_session):
    for bay_num in (1, 2):
        bay = db_session.query(WeighbridgeBay).filter(WeighbridgeBay.bay_number == bay_num).first()
        if not bay:
            bay = WeighbridgeBay(bay_number=bay_num, status="READY", capacity_quintals=500.0)
            db_session.add(bay)
    db_session.commit()


def create_farmer_with_booking(db, name_suffix, token_num=None, slot_str="10:00 AM - 12:00 PM", status="WAITING", booking_date=None):
    # Ensure token number is safe and unique
    if token_num is None or db.query(Token).filter(Token.token_number == token_num).first():
        max_tok = db.query(func.max(Token.token_number)).scalar() or 1000
        token_num = max(token_num or 0, max_tok) + 1

    uid_suffix = uuid.uuid4().hex[:4]
    name_map = {
        "FIFO_First": "Kuldeep Singh",
        "Jumper_Second": "Harjeet Singh",
        "TooEarly": "Anil Kumar",
        "OverrideSuccess": "Mahavir Sharma",
        "OverrideRejected": "Rakesh Kumar",
        "BadPIN": "Sunita Devi",
        "DuplicateTest": "Pawan Yadav",
        "ExpiredQR": "Rajesh Verma",
        "RevokedQR": "Suresh Kumar",
        "LifecycleFlow": "Devinder Lal",
    }
    real_name = name_map.get(name_suffix, f"Kisan {name_suffix}")
    farmer = Farmer(
        farmer_name=real_name,
        phone_number=f"9810{token_num % 10000:04d}{token_num % 90 + 10}",
        village="Karnal Rural",
        district="Karnal",
        state="Haryana",
        preferred_language="Hindi",
    )
    db.add(farmer)
    db.commit()
    db.refresh(farmer)

    # Commodity
    comm = db.query(Commodity).first()
    if not comm:
        comm = Commodity(commodity_name="Wheat", variety="FAQ", minimum_support_price=2275.0, market_rate=2300.0)
        db.add(comm)
        db.commit()
        db.refresh(comm)

    now = datetime.utcnow()
    booking = Booking(
        farmer_id=farmer.id,
        commodity_id=comm.id,
        booking_date=booking_date or now,
        booking_slot=slot_str,
        estimated_quantity=50.0,
        status=status,
        created_at=now - timedelta(minutes=45),
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    tok = Token(
        booking_id=booking.id,
        token_number=token_num,
        queue_position=token_num,
        status=status,
        estimated_arrival=now,
        created_at=now - timedelta(minutes=45),
    )
    db.add(tok)
    db.commit()
    db.refresh(tok)

    # Generate active QR
    qr_svc = QRService(db)
    qr_res = qr_svc.generate_farmer_qr(farmer.id)

    db.refresh(booking)
    return farmer, booking, tok, qr_res


# =========================================================================
# 1. Queue Jumping Blocked
# =========================================================================

def test_queue_jumping_blocked(db_session, test_bays):
    """Verifies that an out-of-turn token cannot start procurement while earlier tokens wait in FIFO order."""
    farmer1, booking1, tok1, _ = create_farmer_with_booking(db_session, "FIFO_First", None, slot_str="12:00 AM - 11:59 PM")
    farmer2, booking2, tok2, _ = create_farmer_with_booking(db_session, "Jumper_Second", tok1.token_number + 1, slot_str="12:00 AM - 11:59 PM")
    assert tok1.token_number < tok2.token_number

    # Attempt to start Token 2 before Token 1
    resp = client.post(
        "/api/v1/procurement/start",
        json={
            "token_number": tok2.token_number,
            "bay_number": 1,
            "operator_id": "Gatekeeper Rajesh",
        },
    )

    assert resp.status_code == 400
    data = resp.json()
    assert data["decision"] in ("DENY", "OVERRIDE_REQUIRED")
    assert data["reason"] == "QUEUE_JUMP_ATTEMPT"
    assert "Queue jumping blocked" in data["details"]


# =========================================================================
# 2. Procurement Before Slot Denied
# =========================================================================

def test_procurement_before_slot_denied(db_session, test_bays):
    # Slot scheduled 4 hours in the future
    fut = datetime.utcnow() + timedelta(hours=4)
    fut_slot = f"{fut.strftime('%I:00 %p')} - {(fut + timedelta(hours=2)).strftime('%I:00 %p')}"
    farmer, booking, tok, _ = create_farmer_with_booking(db_session, "TooEarly", 301, slot_str=fut_slot, booking_date=fut)

    resp = client.post(
        "/api/v1/procurement/start",
        json={
            "booking_id": str(booking.id),
            "bay_number": 1,
            "operator_id": "Gatekeeper Rajesh",
        },
    )

    assert resp.status_code == 400
    data = resp.json()
    assert data["decision"] == "DENY"
    assert data["reason"] == "PROCUREMENT_BEFORE_SLOT"
    assert data["slot"] is not None
    assert data["current_time"] is not None


# =========================================================================
# 3. Approved Override Workflow & Procurement Bypass
# =========================================================================

def test_approved_override_succeeds(db_session, test_bays):
    """Verifies that submitting and approving an override with supervisor PIN permits intake."""
    farmer, booking, tok, _ = create_farmer_with_booking(db_session, "OverrideSuccess", 915, slot_str="11:00 PM - 11:59 PM")

    # 1. Submit Override Request
    req_resp = client.post(
        "/api/v1/fairprocure/override/request",
        json={
            "booking_id": str(booking.id),
            "token_number": tok.token_number,
            "reason": "Perishable produce at high risk due to unseasonal rain",
            "requested_by": "Weighbridge Inbound Gate",
        },
    )
    assert req_resp.status_code == 201
    override_data = req_resp.json()
    override_id = override_data["id"]
    assert override_data["approval_status"] == "PENDING"

    # 2. Approve Override with Supervisor PIN
    appr_resp = client.post(
        "/api/v1/fairprocure/override/approve",
        json={
            "override_id": override_id,
            "supervisor_id": "APMC-SUP-01",
            "supervisor_name": "Secretary Pushkar",
            "pin": "1234",
            "method": "PIN",
        },
    )
    assert appr_resp.status_code == 200
    appr_data = appr_resp.json()
    assert appr_data["approval_status"] == "APPROVED"
    assert appr_data["proof_hash"] is not None

    # 3. Call start procurement again - Should now SUCCEED!
    start_resp = client.post(
        "/api/v1/procurement/start",
        json={
            "booking_id": str(booking.id),
            "bay_number": 1,
            "operator_id": "Gatekeeper Rajesh",
        },
    )
    assert start_resp.status_code == 200
    start_data = start_resp.json()
    assert start_data["decision"] == "ALLOW"
    assert start_data["status"] == "PROCUREMENT_STARTED"


# =========================================================================
# 4. Rejected Override Blocked
# =========================================================================

def test_rejected_override_blocked(db_session, test_bays):
    """Verifies that a rejected override leaves the farmer blocked from starting procurement."""
    fut = datetime.utcnow() + timedelta(hours=4)
    fut_slot = f"{fut.strftime('%I:00 %p')} - {(fut + timedelta(hours=2)).strftime('%I:00 %p')}"
    farmer, booking, tok, _ = create_farmer_with_booking(db_session, "OverrideRejected", 302, slot_str=fut_slot, booking_date=fut)

    # Submit
    req_resp = client.post(
        "/api/v1/fairprocure/override/request",
        json={
            "booking_id": str(booking.id),
            "reason": "Farmer requests early service without emergency",
            "requested_by": "Gate Operator",
        },
    )
    override_id = req_resp.json()["id"]

    # Reject
    rej_resp = client.post(
        "/api/v1/fairprocure/override/reject",
        json={
            "override_id": override_id,
            "supervisor_id": "APMC-SUP-01",
            "reason": "Not an emergency; must wait for scheduled slot window",
        },
    )
    assert rej_resp.status_code == 200
    assert rej_resp.json()["approval_status"] == "REJECTED"

    # Try starting procurement
    start_resp = client.post(
        "/api/v1/procurement/start",
        json={
            "booking_id": str(booking.id),
            "bay_number": 1,
        },
    )
    assert start_resp.status_code == 400
    assert start_resp.json()["decision"] == "DENY"


# =========================================================================
# 5. Invalid Supervisor PIN Rejected
# =========================================================================

def test_invalid_supervisor_pin_rejected(db_session):
    """Verifies that an incorrect PIN rejects override approval and logs a policy violation."""
    farmer, booking, tok, _ = create_farmer_with_booking(db_session, "BadPIN", 925)

    req_resp = client.post(
        "/api/v1/fairprocure/override/request",
        json={
            "booking_id": str(booking.id),
            "reason": "Emergency intake",
        },
    )
    override_id = req_resp.json()["id"]

    # Wrong PIN
    appr_resp = client.post(
        "/api/v1/fairprocure/override/approve",
        json={
            "override_id": override_id,
            "supervisor_id": "SUP-01",
            "pin": "9999",  # Incorrect PIN
        },
    )
    assert appr_resp.status_code == 400
    assert "Invalid supervisor PIN" in appr_resp.json()["detail"]


# =========================================================================
# 6. Duplicate Procurement Blocked
# =========================================================================

def test_duplicate_procurement_blocked(db_session, test_bays):
    """Verifies that re-procuring an already SERVED token is blocked."""
    farmer, booking, tok, _ = create_farmer_with_booking(db_session, "DuplicateTest", 930, status="SERVED")
    booking.status = "SERVED"
    db_session.commit()

    resp = client.post(
        "/api/v1/procurement/start",
        json={
            "token_number": tok.token_number,
            "bay_number": 1,
        },
    )
    assert resp.status_code == 400
    data = resp.json()
    assert data["decision"] == "DENY"
    assert data["reason"] == "ALREADY_PROCURED"


# =========================================================================
# 7. Expired QR Identity Blocked
# =========================================================================

def test_expired_qr_blocked(db_session):
    """Verifies that an expired permanent QR token is rejected by the Rule Engine."""
    farmer, booking, tok, _ = create_farmer_with_booking(db_session, "ExpiredQR", 935)
    token = db_session.query(QRToken).filter(QRToken.farmer_id == farmer.id, QRToken.is_active.is_(True)).first()
    token.expires_at = datetime.utcnow() - timedelta(days=2)
    db_session.commit()

    resp = client.post(
        "/api/v1/procurement/start",
        json={"booking_id": str(booking.id)},
    )
    assert resp.status_code == 400
    assert resp.json()["decision"] == "DENY"
    assert resp.json()["reason"] == "QR_EXPIRED"


# =========================================================================
# 8. Revoked QR Identity Blocked
# =========================================================================

def test_revoked_qr_blocked(db_session):
    """Verifies that an inactive/revoked QR identity token is rejected."""
    farmer, booking, tok, _ = create_farmer_with_booking(db_session, "RevokedQR", 940)
    token = db_session.query(QRToken).filter(QRToken.farmer_id == farmer.id, QRToken.is_active.is_(True)).first()
    token.is_active = False
    token.status = "revoked"
    db_session.commit()

    resp = client.post(
        "/api/v1/procurement/start",
        json={"booking_id": str(booking.id)},
    )
    assert resp.status_code == 400
    assert resp.json()["decision"] == "DENY"
    assert resp.json()["reason"] == "QR_REVOKED"


# =========================================================================
# 9. Procurement Lifecycle Transitions Enforced
# =========================================================================

def test_procurement_lifecycle_transitions(db_session):
    """Verifies valid milestone transitions succeed while illegal jumps throw HTTP 400."""
    farmer, booking, tok, _ = create_farmer_with_booking(db_session, "LifecycleFlow", 945)

    # 1. Create event at ARRIVED
    ev = ProcurementEvent(
        farmer_id=farmer.id,
        booking_id=booking.id,
        status="ARRIVED",
        started_at=datetime.utcnow(),
    )
    db_session.add(ev)
    db_session.commit()
    db_session.refresh(ev)

    # 2. Advance: ARRIVED -> QR_VERIFIED (Valid)
    resp1 = client.post(
        "/api/v1/procurement/transition",
        json={
            "event_id": str(ev.id),
            "target_status": "QR_VERIFIED",
            "remarks": "Identity verified at gate terminal",
        },
    )
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "QR_VERIFIED"

    # 3. Advance: QR_VERIFIED -> QUEUE_ENTERED (Valid)
    resp2 = client.post(
        "/api/v1/procurement/transition",
        json={
            "event_id": str(ev.id),
            "target_status": "QUEUE_ENTERED",
        },
    )
    assert resp2.status_code == 200

    # 4. Attempt Illegal Jump: QUEUE_ENTERED -> ARRIVED (Illegal backwards jump)
    resp3 = client.post(
        "/api/v1/procurement/transition",
        json={
            "event_id": str(ev.id),
            "target_status": "ARRIVED",
        },
    )
    assert resp3.status_code == 400
    assert "Illegal procurement transition" in resp3.json()["detail"]


# =========================================================================
# 10. Dashboard Telemetry & Alerts Feed
# =========================================================================

def test_dashboard_fairness_and_alerts_apis(db_session):
    """Verifies that the new dashboard fairness metrics and alert feed endpoints respond with 200 OK."""
    # 1. GET /api/v1/dashboard/fairness
    fair_resp = client.get("/api/v1/dashboard/fairness")
    assert fair_resp.status_code == 200
    fair_data = fair_resp.json()

    assert "today_procurements" in fair_data
    assert "today_overrides" in fair_data
    assert "pending_overrides" in fair_data
    assert "denied_attempts" in fair_data
    assert "queue_jump_attempts" in fair_data
    assert "early_arrival_attempts" in fair_data
    assert "average_waiting_time_minutes" in fair_data
    assert "qr_success_rate" in fair_data
    assert "qr_failure_rate" in fair_data
    assert "queue_compliance" in fair_data
    assert "fairness_score" in fair_data
    assert 0.0 <= fair_data["fairness_score"] <= 100.0
    assert "audit_events_today" in fair_data

    # 2. GET /api/v1/dashboard/alerts
    alerts_resp = client.get("/api/v1/dashboard/alerts")
    assert alerts_resp.status_code == 200
    alerts_data = alerts_resp.json()
    assert isinstance(alerts_data, list)
    if alerts_data:
        assert "type" in alerts_data[0]
        assert "severity" in alerts_data[0]
        assert "message" in alerts_data[0]
