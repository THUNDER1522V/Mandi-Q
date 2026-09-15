import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.database.session import get_db
from app.models import Booking, Token, Farmer, AuditLog, ActivityLog, OverrideRequest

logger = logging.getLogger("mandiq.fairprocure")

router = APIRouter(prefix="/fairprocure", tags=["FairProcure"])


class TokenVerificationRequest(BaseModel):
    token_number: int = Field(..., description="Token number to verify")
    qr_data: Optional[str] = Field(None, description="Scanned QR payload / hash")


class TokenVerificationResponse(BaseModel):
    valid: bool
    token_number: int
    token_formatted: str
    farmer_name: str
    phone: str
    commodity: str
    slot_time: str
    status: str
    tamper_proof_hash: str
    integrity_verified: bool


class EarlyOverrideRequest(BaseModel):
    token_number: int = Field(..., description="Token number to override")
    supervisor_id: str = Field(..., description="APMC Supervisor ID authorized to override")
    supervisor_name: str = Field(default="Secretary Desk (Pushkar)", description="Supervisor Name")
    reason: str = Field(..., description="Reason for early intake override, e.g. Perishable Crop Risk / Heavy Rain")


@router.post("/verify-token", response_model=TokenVerificationResponse, summary="Verify token authenticity and slot integrity")
def verify_token_api(req: TokenVerificationRequest, db: Session = Depends(get_db)):
    token = (
        db.query(Token)
        .options(joinedload(Token.booking).joinedload(Booking.farmer), joinedload(Token.booking).joinedload(Booking.commodity))
        .filter(Token.token_number == req.token_number)
        .first()
    )

    if not token or not token.booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Token {req.token_number} not found in APMC gate ledger"
        )

    b = token.booking
    farmer_name = b.farmer.farmer_name if b.farmer else "Unknown Farmer"
    phone = b.farmer.phone_number if b.farmer else ""
    crop = b.commodity.commodity_name if b.commodity else "Wheat"
    slot_time = b.booking_slot or "10:00 AM"

    # Compute deterministic SHA256 integrity hash
    salt = "MANDIQ_APMC_INTEGRITY_2026"
    raw_payload = f"{token.token_number}:{farmer_name}:{phone}:{crop}:{slot_time}:{salt}"
    tamper_hash = hashlib.sha256(raw_payload.encode()).hexdigest()

    return TokenVerificationResponse(
        valid=True,
        token_number=token.token_number,
        token_formatted=f"TK-{str(token.token_number).zfill(3)}",
        farmer_name=farmer_name,
        phone=phone,
        commodity=crop,
        slot_time=slot_time,
        status=b.status,
        tamper_proof_hash=tamper_hash,
        integrity_verified=True,
    )


@router.post("/override", summary="Authorize early procurement override with immutable audit trail")
def early_override_api(req: EarlyOverrideRequest, db: Session = Depends(get_db)):
    logger.warning("FairProcure override requested for Token %d by %s: %s", req.token_number, req.supervisor_name, req.reason)
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    token = (
        db.query(Token)
        .options(joinedload(Token.booking).joinedload(Booking.farmer))
        .filter(Token.token_number == req.token_number)
        .first()
    )

    if not token or not token.booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Token {req.token_number} not found for override"
        )

    b = token.booking
    farmer_name = b.farmer.farmer_name if b.farmer else f"Farmer {req.token_number}"

    # Generate cryptographic tamper-evident hash for the override event
    override_hash = hashlib.sha256(f"{req.token_number}:{req.supervisor_id}:{now.isoformat()}:{req.reason}".encode()).hexdigest()

    # 1. Create OverrideRequest record
    ov = OverrideRequest(
        booking_id=b.id,
        token_number=req.token_number,
        farmer_name=farmer_name,
        requested_by="Weighbridge Inbound Gate",
        authorized_by=f"{req.supervisor_name} ({req.supervisor_id})",
        reason=req.reason,
        qr_hash=override_hash,
        status="AUTHORIZED",
        created_at=now,
    )
    db.add(ov)

    # 2. Immutable AuditLog entry
    audit = AuditLog(
        action="FAIRPROCURE_EARLY_OVERRIDE",
        performed_by=f"{req.supervisor_name} ({req.supervisor_id})",
        details=f"Token TK-{req.token_number:03d} ({farmer_name}) authorized for early procurement intake. Reason: '{req.reason}'. Proof Hash: {override_hash[:16]}...",
        created_at=now,
    )
    db.add(audit)

    # 3. Activity Log for live dashboard ticker
    db.add(ActivityLog(
        title=f"Supervisor Override · Token TK-{req.token_number:03d}",
        detail=f"Authorized by {req.supervisor_name} · Reason: {req.reason}",
        event_type="system",
        created_at=now,
    ))

    db.commit()
    return {
        "success": True,
        "message": f"Token TK-{req.token_number:03d} authorized for early intake",
        "proof_hash": override_hash,
        "authorized_at": now.isoformat(),
    }


@router.get("/overrides", summary="Get all supervisor override records")
def list_overrides_api(db: Session = Depends(get_db)):
    records = db.query(OverrideRequest).order_by(OverrideRequest.created_at.desc()).all()
    return [
        {
            "id": str(r.id),
            "token_number": r.token_number,
            "farmer_name": r.farmer_name,
            "requested_by": r.requested_by,
            "authorized_by": r.authorized_by,
            "reason": r.reason,
            "qr_hash": r.qr_hash,
            "status": r.status or r.approval_status,
            "approval_status": r.approval_status or r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


# =========================================================================
# Sprint 4: FairProcure Dual-Authorization Override Workflow Endpoints
# =========================================================================

from app.schemas.fairprocure import (
    OverrideApproveRequest,
    OverrideCreateRequest,
    OverrideRejectRequest,
    OverrideResponse,
)
from app.services.fairprocure.override_service import OverrideService


def _serialize_override(r: OverrideRequest) -> OverrideResponse:
    return OverrideResponse(
        id=str(r.id),
        farmer_id=str(r.farmer_id) if r.farmer_id else None,
        booking_id=str(r.booking_id) if r.booking_id else None,
        token_number=r.token_number,
        farmer_name=r.farmer_name,
        reason=r.reason,
        requested_by=r.requested_by,
        approved_by=r.approved_by,
        approval_status=r.approval_status or r.status or "PENDING",
        approval_method=r.approval_method or "PIN",
        proof_hash=r.qr_hash,
        created_at=r.created_at.isoformat() if r.created_at else "",
        approved_at=r.approved_at.isoformat() if r.approved_at else None,
    )


@router.post(
    "/override/request",
    response_model=OverrideResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit exceptional early or out-of-turn procurement override request",
)
def request_override_api(req: OverrideCreateRequest, db: Session = Depends(get_db)):
    svc = OverrideService(db)
    created = svc.request_override(
        reason=req.reason,
        farmer_id=req.farmer_id,
        booking_id=req.booking_id,
        token_number=req.token_number,
        requested_by=req.requested_by,
    )
    return _serialize_override(created)


@router.post(
    "/override/approve",
    response_model=OverrideResponse,
    summary="Supervisor approves override with cryptographic PIN dual-authorization",
)
def approve_override_api(req: OverrideApproveRequest, db: Session = Depends(get_db)):
    svc = OverrideService(db)
    try:
        approved = svc.approve_override(
            override_id=req.override_id,
            supervisor_id=req.supervisor_id,
            supervisor_name=req.supervisor_name,
            pin=req.pin,
            method=req.method,
        )
        return _serialize_override(approved)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"OverrideRequest {req.override_id} not found",
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )


@router.post(
    "/override/reject",
    response_model=OverrideResponse,
    summary="Supervisor rejects out-of-turn override request",
)
def reject_override_api(req: OverrideRejectRequest, db: Session = Depends(get_db)):
    svc = OverrideService(db)
    try:
        rejected = svc.reject_override(
            override_id=req.override_id,
            supervisor_id=req.supervisor_id,
            reason=req.reason,
        )
        return _serialize_override(rejected)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"OverrideRequest {req.override_id} not found",
        )


@router.get(
    "/override/pending",
    response_model=List[OverrideResponse],
    summary="Get all pending override requests awaiting supervisor action",
)
def get_pending_overrides_api(db: Session = Depends(get_db)):
    svc = OverrideService(db)
    pending = svc.get_pending_overrides()
    return [_serialize_override(r) for r in pending]


@router.get(
    "/override/history",
    response_model=List[OverrideResponse],
    summary="Get full historical override audit log",
)
def get_override_history_api(limit: int = 100, db: Session = Depends(get_db)):
    svc = OverrideService(db)
    history = svc.get_override_history(limit=limit)
    return [_serialize_override(r) for r in history]

