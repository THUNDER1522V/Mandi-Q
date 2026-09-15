"""FairProcure QR Identity & Verification API Router.
Production-ready endpoints for dynamic QR generation, cryptographic verification,
multi-format download (PNG, SVG, JSON), versioned regeneration, and dashboard metrics.
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, joinedload

from app.core.enums.fairprocure import RuleDecision
from app.database.session import get_db
from app.models.bookings import Booking
from app.models.farmer import Farmer
from app.models.qr_token import QRToken
from app.schemas.qr import (
    QRDashboardMetricsResponse,
    QRErrorResponse,
    QRMetadataResponse,
    QRPayloadData,
    QRRegenerateRequest,
    QRVerificationRequest,
    QRVerificationResponse,
)
from app.services.fairprocure.qr_service import QRService
from app.services.fairprocure.rule_engine import FairProcureRuleEngine

router = APIRouter(prefix="/qr", tags=["FairProcure QR Identity"])


# =============================================================================
# 1. QR Generation
# =============================================================================

@router.post(
    "/generate/{farmer_id}",
    response_model=QRMetadataResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate or retrieve permanent QR identity for farmer",
    description="Issues a cryptographically signed HMAC-SHA256 QR identity token for the specified farmer.",
    responses={
        404: {"model": QRErrorResponse, "description": "Farmer not found in APMC database"},
    },
)
def generate_farmer_qr_api(
    farmer_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    qr_service = QRService(db)
    farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer with UUID '{farmer_id}' does not exist in registry.",
        )

    token, payload_dict = qr_service.generate_farmer_qr(farmer_id=farmer_id)
    return QRMetadataResponse(
        id=str(token.id),
        farmer_id=str(farmer.id),
        farmer_name=farmer.farmer_name,
        phone=farmer.phone_number,
        qr_code=token.qr_code,
        version=token.version,
        verification_count=token.verification_count,
        is_active=token.is_active,
        status=token.status,
        generated_at=token.generated_at.isoformat() if token.generated_at else "",
        expires_at=token.expires_at.isoformat() if token.expires_at else None,
        last_scanned_at=token.last_scanned_at.isoformat() if token.last_scanned_at else None,
        last_verified_by=token.last_verified_by,
        qr_png_url=f"/api/v1/qr/{farmer.id}?format=png",
        qr_svg_url=f"/api/v1/qr/{farmer.id}?format=svg",
        payload=QRPayloadData(**payload_dict),
    )


# =============================================================================
# 2. QR Verification
# =============================================================================

@router.post(
    "/verify",
    response_model=QRVerificationResponse,
    summary="Verify scanned QR identity at APMC gate barrier",
    description="Validates cryptographic signature, checks active registration, updates scan telemetry, and queries the FairProcure Rule Engine for gate admission.",
    responses={
        400: {"model": QRErrorResponse, "description": "Malformed QR data or unparseable payload"},
    },
)
def verify_qr_api(
    req: QRVerificationRequest,
    db: Session = Depends(get_db),
):
    qr_service = QRService(db)
    rule_engine = FairProcureRuleEngine(db)

    # 1. Execute multi-step QR verification pipeline
    is_valid, msg, qr_token, payload, status_code = qr_service.verify_qr(
        qr_input=req.qr_data,
        operator_id=req.operator_id or "GATE-OFFICER-01",
        device_id=req.device_id or "GATE-SCANNER-01",
    )

    if not is_valid or not payload:
        return QRVerificationResponse(
            valid=False,
            status=status_code,
            rule_decision=RuleDecision.DENY,
            message=msg,
            farmer=None,
            booking=None,
            token=None,
            verified_at=qr_token.last_scanned_at.isoformat() if (qr_token and qr_token.last_scanned_at) else "",
            device_id=req.device_id,
            operator_id=req.operator_id,
        )

    # 2. Fetch context entities for decision making & response
    farmer_id = uuid.UUID(payload["farmer_id"])
    farmer = (
        db.query(Farmer)
        .options(joinedload(Farmer.bookings))
        .filter(Farmer.id == farmer_id)
        .first()
    )

    booking = None
    token_entity = None
    if payload.get("booking_id"):
        booking = (
            db.query(Booking)
            .options(joinedload(Booking.token), joinedload(Booking.commodity))
            .filter(Booking.id == uuid.UUID(payload["booking_id"]))
            .first()
        )
    if not booking:
        # Check if farmer has an active booking for today
        booking = (
            db.query(Booking)
            .options(joinedload(Booking.token), joinedload(Booking.commodity))
            .filter(Booking.farmer_id == farmer_id)
            .order_by(Booking.booking_date.desc())
            .first()
        )

    if booking and booking.token:
        token_entity = booking.token

    # 3. Call Rule Engine for Gate Admission Decision
    rule_decision, rule_msg = rule_engine.evaluate_verification(
        farmer=farmer,
        booking=booking,
        token=token_entity,
        qr_token=qr_token,
        device_id=req.device_id,
    )

    farmer_data = {
        "id": str(farmer.id),
        "name": farmer.farmer_name,
        "phone": farmer.phone_number,
        "village": farmer.village,
        "district": farmer.district,
    } if farmer else None

    booking_data = {
        "id": str(booking.id),
        "slot_time": booking.booking_slot,
        "commodity": booking.commodity.commodity_name if booking.commodity else "Wheat",
        "estimated_quantity": booking.estimated_quantity,
        "status": booking.status,
    } if booking else None

    token_data = {
        "token_number": token_entity.token_number,
        "token_formatted": f"TK-{str(token_entity.token_number).zfill(3)}",
        "queue_position": token_entity.queue_position,
        "status": token_entity.status,
    } if token_entity else None

    return QRVerificationResponse(
        valid=True,
        status="VALID",
        rule_decision=rule_decision,
        message=f"{msg} Decision: {rule_decision.value} - {rule_msg}",
        farmer=farmer_data,
        booking=booking_data,
        token=token_data,
        verified_at=qr_token.last_scanned_at.isoformat() if qr_token.last_scanned_at else "",
        device_id=req.device_id,
        operator_id=req.operator_id,
    )


# =============================================================================
# 3. QR Regeneration
# =============================================================================

@router.post(
    "/regenerate/{farmer_id}",
    response_model=QRMetadataResponse,
    summary="Regenerate farmer QR identity with incremented version",
    description="Revokes previous QR token, increments version, signs new payload, and preserves full historical audit trail.",
    responses={
        404: {"model": QRErrorResponse, "description": "Farmer not found"},
    },
)
def regenerate_farmer_qr_api(
    farmer_id: uuid.UUID,
    req: Optional[QRRegenerateRequest] = None,
    db: Session = Depends(get_db),
):
    qr_service = QRService(db)
    farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer with UUID '{farmer_id}' does not exist in APMC registry.",
        )

    reason = req.reason if req else "Routine reissuance / device replacement"
    operator_id = req.operator_id if req else "SUPERVISOR-DESK-01"

    new_token, payload_dict = qr_service.regenerate_qr(
        farmer_id=farmer_id,
        reason=reason,
        operator_id=operator_id,
    )

    return QRMetadataResponse(
        id=str(new_token.id),
        farmer_id=str(farmer.id),
        farmer_name=farmer.farmer_name,
        phone=farmer.phone_number,
        qr_code=new_token.qr_code,
        version=new_token.version,
        verification_count=new_token.verification_count,
        is_active=new_token.is_active,
        status=new_token.status,
        generated_at=new_token.generated_at.isoformat() if new_token.generated_at else "",
        expires_at=new_token.expires_at.isoformat() if new_token.expires_at else None,
        last_scanned_at=new_token.last_scanned_at.isoformat() if new_token.last_scanned_at else None,
        last_verified_by=new_token.last_verified_by,
        qr_png_url=f"/api/v1/qr/{farmer.id}?format=png",
        qr_svg_url=f"/api/v1/qr/{farmer.id}?format=svg",
        payload=QRPayloadData(**payload_dict),
    )


# =============================================================================
# 4. QR Download (PNG / SVG / JSON)
# =============================================================================

@router.get(
    "/{farmer_id}",
    summary="Download or view farmer QR code in PNG, SVG, or JSON format",
    description="Retrieves active QR identity. Specify ?format=png for binary PNG, ?format=svg for vector SVG, or ?format=json for metadata.",
    responses={
        200: {
            "description": "High-resolution PNG, vector SVG, or metadata JSON",
            "content": {
                "image/png": {},
                "image/svg+xml": {},
                "application/json": {},
            },
        },
        404: {"model": QRErrorResponse, "description": "Farmer or active QR not found"},
    },
)
def get_farmer_qr_api(
    farmer_id: uuid.UUID,
    format: str = Query(
        "json",
        description="Response format: 'png' for image/png, 'svg' for vector SVG, 'json' for metadata",
        examples=["png", "svg", "json"]
    ),
    db: Session = Depends(get_db),
):
    qr_service = QRService(db)
    farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Farmer with UUID '{farmer_id}' does not exist.",
        )

    # Get active token or generate one if first time
    token, payload_dict = qr_service.generate_farmer_qr(farmer_id=farmer.id)

    normalized_fmt = format.strip().lower()
    if normalized_fmt == "png":
        png_bytes = qr_service.render_png(payload_dict)
        return Response(
            content=png_bytes,
            media_type="image/png",
            headers={
                "Content-Disposition": f'inline; filename="farmer_{farmer.id}_qr.png"',
                "Cache-Control": "public, max-age=3600",
            },
        )
    elif normalized_fmt == "svg":
        svg_str = qr_service.render_svg(payload_dict)
        return Response(
            content=svg_str,
            media_type="image/svg+xml",
            headers={
                "Content-Disposition": f'inline; filename="farmer_{farmer.id}_qr.svg"',
                "Cache-Control": "public, max-age=3600",
            },
        )
    else:
        return QRMetadataResponse(
            id=str(token.id),
            farmer_id=str(farmer.id),
            farmer_name=farmer.farmer_name,
            phone=farmer.phone_number,
            qr_code=token.qr_code,
            version=token.version,
            verification_count=token.verification_count,
            is_active=token.is_active,
            status=token.status,
            generated_at=token.generated_at.isoformat() if token.generated_at else "",
            expires_at=token.expires_at.isoformat() if token.expires_at else None,
            last_scanned_at=token.last_scanned_at.isoformat() if token.last_scanned_at else None,
            last_verified_by=token.last_verified_by,
            qr_png_url=f"/api/v1/qr/{farmer.id}?format=png",
            qr_svg_url=f"/api/v1/qr/{farmer.id}?format=svg",
            payload=QRPayloadData(**payload_dict),
        )


# =============================================================================
# 5. Dashboard Metrics
# =============================================================================

@router.get(
    "/dashboard/metrics",
    response_model=QRDashboardMetricsResponse,
    summary="Real-time QR verification telemetry for APMC dashboard",
    description="Aggregates today's QR generations, verifications, failures, active/revoked counts, and verification success rates.",
)
def get_qr_dashboard_metrics_api(
    db: Session = Depends(get_db),
):
    qr_service = QRService(db)
    metrics = qr_service.get_dashboard_metrics()
    return QRDashboardMetricsResponse(**metrics)


# =============================================================================
# 6. QR Revocation
# =============================================================================

@router.post(
    "/revoke/{farmer_id}",
    summary="Instantly revoke farmer QR identity",
    description="Marks active QR token as revoked without deleting history, preventing further gate admissions.",
    responses={
        404: {"model": QRErrorResponse, "description": "Farmer or active QR not found"},
    },
)
def revoke_farmer_qr_api(
    farmer_id: uuid.UUID,
    reason: str = Query("Administrative revocation / Duplicate detected", description="Revocation justification"),
    operator_id: str = Query("SUPERVISOR-DESK-01", description="Authorizing supervisor ID"),
    db: Session = Depends(get_db),
):
    qr_service = QRService(db)
    try:
        revoked = qr_service.revoke_qr(
            farmer_id=farmer_id,
            reason=reason,
            operator_id=operator_id,
        )
        return {
            "success": True,
            "message": f"QR token {revoked.qr_code} revoked successfully.",
            "farmer_id": str(farmer_id),
            "status": revoked.status,
            "is_active": revoked.is_active,
        }
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
