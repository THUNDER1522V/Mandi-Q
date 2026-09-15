"""FastAPI router for FairProcure Procurement Governance and Lifecycle State Machine."""
from __future__ import annotations

import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.enums.fairprocure import RuleDecision
from app.database.session import get_db
from app.schemas.fairprocure import (
    ProcurementErrorResponse,
    ProcurementStartRequest,
    ProcurementStartResponse,
    ProcurementTransitionRequest,
    ProcurementTransitionResponse,
)
from app.services.fairprocure.procurement_service import ProcurementLifecycleService

logger = logging.getLogger("mandiq.fairprocure.procurement_api")

router = APIRouter(prefix="/procurement", tags=["FairProcure Procurement"])


@router.post(
    "/start",
    response_model=ProcurementStartResponse,
    responses={
        400: {
            "model": ProcurementErrorResponse,
            "description": "Rule Engine Denied or Out-of-Turn Queue Jump Attempt",
        }
    },
    summary="Start procurement with automatic Rule Engine slot and anti-queue-jump enforcement",
)
def start_procurement_api(
    req: ProcurementStartRequest,
    http_req: Request,
    db: Session = Depends(get_db),
):
    """Primary FairProcure gatekeeper endpoint invoked when procurement intake begins.

    Server-side checks executed automatically:
    - QR Identity Valid
    - Booking Active
    - Slot Window & Arrival Buffer
    - Queue Jump Prevention (FIFO check)
    - Re-procurement / Duplicate Prevention
    - Approved Override Bypass
    """
    client_ip = http_req.client.host if http_req.client else None
    svc = ProcurementLifecycleService(db)

    decision, reason, event, meta = svc.start_procurement(
        booking_id=req.booking_id,
        token_number=req.token_number,
        farmer_id=req.farmer_id,
        bay_number=req.bay_number,
        operator_id=req.operator_id,
        device_id=req.device_id,
        qr_data=req.qr_data,
        ip_address=client_ip,
    )

    if decision == RuleDecision.ALLOW:
        return ProcurementStartResponse(
            decision=RuleDecision.ALLOW,
            message="Procurement cleared and admitted to weighbridge bay.",
            procurement_event_id=str(event.id) if event else None,
            booking_id=meta.get("booking_id"),
            token_number=meta.get("token_number"),
            farmer_name=meta.get("farmer_name"),
            status=meta.get("status", "PROCUREMENT_STARTED"),
            bay_number=meta.get("bay_number"),
            started_at=meta.get("started_at", ""),
        )

    # Rejection or Override Required
    err_payload = {
        "decision": decision.value,
        "reason": reason,
        "slot": meta.get("slot"),
        "current_time": meta.get("current_time"),
        "details": meta.get("message") or f"Procurement rejected by FairProcure Rule Engine ({reason}).",
    }
    logger.warning("Procurement start rejected: %s", err_payload)
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content=err_payload)


@router.post(
    "/transition",
    response_model=ProcurementTransitionResponse,
    summary="Transition procurement event across the 13 lifecycle milestones",
)
def transition_procurement_api(
    req: ProcurementTransitionRequest,
    http_req: Request,
    db: Session = Depends(get_db),
):
    """Transitions a procurement event to the next milestone after strict graph validation."""
    client_ip = http_req.client.host if http_req.client else None
    svc = ProcurementLifecycleService(db)
    try:
        prev_event = svc.db.query(svc.db.query(ProcurementLifecycleService).session.models if False else None)
        # Fetch previous status for response
        existing = svc.db.query(svc.db.query(svc.__class__).session if False else None)
        from app.models.procurement_event import ProcurementEvent
        ev = db.query(ProcurementEvent).filter(ProcurementEvent.id == req.event_id).first()
        prev_st = ev.status if ev else "UNKNOWN"

        updated = svc.transition_milestone(
            event_id=req.event_id,
            target_status=req.target_status,
            remarks=req.remarks,
            operator_id=req.operator_id,
            ip_address=client_ip,
        )
        return ProcurementTransitionResponse(
            event_id=str(updated.id),
            previous_status=prev_st,
            status=updated.status,
            remarks=updated.remarks,
            updated_at=updated.updated_at.isoformat() if updated.updated_at else "",
        )
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ProcurementEvent {req.event_id} not found",
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )


@router.get(
    "/timeline/{booking_id}",
    summary="Get chronological procurement milestone events for a booking",
)
def get_procurement_timeline_api(booking_id: uuid.UUID, db: Session = Depends(get_db)):
    svc = ProcurementLifecycleService(db)
    timeline = svc.get_timeline(booking_id=booking_id)
    return [
        {
            "id": str(e.id),
            "status": e.status,
            "started_at": e.started_at.isoformat() if e.started_at else None,
            "completed_at": e.completed_at.isoformat() if e.completed_at else None,
            "remarks": e.remarks,
            "created_by": e.created_by,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in timeline
    ]
