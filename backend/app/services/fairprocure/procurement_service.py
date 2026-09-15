"""FairProcure Procurement Lifecycle Service.
Manages the end-to-end procurement state machine across all 13 operational milestones,
strictly enforcing Rule Engine validation prior to procurement start and milestone transitions.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.constants.fairprocure import (
    AUDIT_DUPLICATE_PROCUREMENT_ATTEMPT,
    AUDIT_PROCUREMENT_COMPLETED,
    AUDIT_PROCUREMENT_STARTED,
    AUDIT_RULE_ENGINE_DENIED,
    ENTITY_BOOKING,
    ENTITY_PROCUREMENT_EVENT,
)
from app.core.enums.fairprocure import ProcurementStatus, RuleDecision
from app.models.activity_log import ActivityLog
from app.models.bookings import Booking
from app.models.farmer import Farmer
from app.models.procurement import Procurement
from app.models.procurement_event import ProcurementEvent
from app.models.token import Token
from app.models.weighbridge_bay import WeighbridgeBay
from app.services.fairprocure.audit_service import AuditService
from app.services.fairprocure.rule_engine import FairProcureRuleEngine

logger = logging.getLogger("mandiq.fairprocure.lifecycle")


class ProcurementLifecycleService:
    """Enterprise state machine coordinating end-to-end procurement milestones."""

    def __init__(self, db: Session) -> None:
        """Initialize ProcurementLifecycleService with database session."""
        self.db = db
        self.rule_engine = FairProcureRuleEngine(db)
        self.audit_service = AuditService(db)
        logger.debug("ProcurementLifecycleService initialized")

    def start_procurement(
        self,
        booking_id: Optional[uuid.UUID] = None,
        token_number: Optional[int] = None,
        farmer_id: Optional[uuid.UUID] = None,
        bay_number: int = 1,
        operator_id: str = "Weighbridge Terminal 01",
        device_id: Optional[str] = "GATE-TERMINAL-01",
        qr_data: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> Tuple[RuleDecision, str, Optional[ProcurementEvent], Dict[str, Any]]:
        """Starts procurement cycle after strict, server-side Rule Engine verification.

        Returns:
            Tuple of (RuleDecision, reason_or_message, ProcurementEvent, metadata_dict).
        """
        now = datetime.utcnow()
        logger.info(
            "Attempting to start procurement for booking=%s token=%d farmer=%s at bay=%d by=%s",
            booking_id, token_number or 0, farmer_id, bay_number, operator_id
        )

        # 1. Resolve Booking
        booking = None
        if booking_id:
            booking = self.db.query(Booking).filter(Booking.id == booking_id).first()
        elif token_number:
            tok = self.db.query(Token).filter(Token.token_number == token_number).first()
            if tok and tok.booking:
                booking = tok.booking
        elif farmer_id:
            booking = (
                self.db.query(Booking)
                .filter(Booking.farmer_id == farmer_id)
                .order_by(Booking.booking_date.desc())
                .first()
            )

        if not booking:
            return (
                RuleDecision.DENY,
                "BOOKING_NOT_FOUND",
                None,
                {"message": "Booking schedule record not found in APMC platform."},
            )

        tok_num = booking.token.token_number if booking.token else token_number

        # 2. Evaluate Rule Engine Master Procurement Check
        decision, reason, meta = self.rule_engine.evaluate_procurement(
            booking_id=booking.id,
            token_number=tok_num,
            farmer_id=booking.farmer_id,
            current_time=now,
        )

        if decision != RuleDecision.ALLOW:
            # Audit the denial / override requirement
            audit_action = (
                AUDIT_DUPLICATE_PROCUREMENT_ATTEMPT
                if reason == "ALREADY_PROCURED"
                else AUDIT_RULE_ENGINE_DENIED
            )
            self.audit_service.log_action(
                action=audit_action,
                performed_by=operator_id,
                entity_type=ENTITY_BOOKING,
                entity_id=str(booking.id),
                device_id=device_id,
                ip_address=ip_address,
                remarks=f"Procurement start rejected: {reason}. {meta.get('message', '')}",
                new_value={"decision": decision.value, "reason": reason, "metadata": meta},
            )
            return decision, reason, None, meta

        # 3. Rule Engine CLEARED! Start Procurement Lifecycle
        # Look for existing event or create new one
        event = (
            self.db.query(ProcurementEvent)
            .filter(ProcurementEvent.booking_id == booking.id)
            .order_by(ProcurementEvent.created_at.desc())
            .first()
        )

        if not event:
            event = ProcurementEvent(
                farmer_id=booking.farmer_id,
                booking_id=booking.id,
                queue_id=booking.token.id if booking.token else None,
                status=ProcurementStatus.PROCUREMENT_STARTED.value,
                started_at=now,
                created_by=operator_id,
                remarks=f"Procurement started at Weighbridge Bay 0{bay_number}",
                created_at=now,
                updated_at=now,
            )
            self.db.add(event)
        else:
            event.status = ProcurementStatus.PROCUREMENT_STARTED.value
            event.started_at = now
            event.updated_at = now

        # Update Booking and Token
        booking.status = "SERVING"
        booking.bay_number = bay_number
        if booking.token:
            booking.token.status = "SERVING"

        # Update Bay
        bay = self.db.query(WeighbridgeBay).filter(WeighbridgeBay.bay_number == bay_number).first()
        if bay:
            bay.status = "SERVING"
            bay.current_token = tok_num
            bay.updated_at = now

        self.db.commit()
        self.db.refresh(event)
        self.db.refresh(booking)

        # 4. Immutable Audit Record
        tok_str = f"TK-{str(tok_num).zfill(3)}" if tok_num else "Farmer"
        farmer_name = booking.farmer.farmer_name if booking.farmer else "Farmer"
        self.audit_service.log_action(
            action=AUDIT_PROCUREMENT_STARTED,
            performed_by=operator_id,
            entity_type=ENTITY_PROCUREMENT_EVENT,
            entity_id=str(event.id),
            device_id=device_id,
            ip_address=ip_address,
            old_value={"status": "WAITING"},
            new_value={
                "status": ProcurementStatus.PROCUREMENT_STARTED.value,
                "bay_number": bay_number,
                "token_number": tok_num,
            },
            remarks=f"Procurement started for {farmer_name} ({tok_str}) at Bay 0{bay_number}",
        )

        # 5. Activity Log ticker
        self.db.add(
            ActivityLog(
                title=f"Procurement Started · {tok_str}",
                detail=f"{farmer_name} admitted to Weighbridge Bay 0{bay_number}",
                event_type="bay",
                created_at=now,
            )
        )
        self.db.commit()

        return (
            RuleDecision.ALLOW,
            "PROCUREMENT_STARTED",
            event,
            {
                "booking_id": str(booking.id),
                "token_number": tok_num,
                "farmer_name": farmer_name,
                "bay_number": bay_number,
                "status": ProcurementStatus.PROCUREMENT_STARTED.value,
                "started_at": now.isoformat(),
            },
        )

    def transition_milestone(
        self,
        event_id: uuid.UUID,
        target_status: ProcurementStatus,
        remarks: Optional[str] = None,
        operator_id: str = "Weighbridge Bay 01",
        ip_address: Optional[str] = None,
    ) -> ProcurementEvent:
        """Transitions a procurement event to the next milestone after strict graph validation.

        Raises:
            KeyError: If event does not exist.
            ValueError: If transition violates the 13-milestone directed state machine graph.
        """
        event = self.db.query(ProcurementEvent).filter(ProcurementEvent.id == event_id).first()
        if not event:
            raise KeyError(f"ProcurementEvent {event_id} not found")

        current_st = event.status
        # Validate legality with Rule Engine
        decision, reason, meta = self.rule_engine.evaluate_transition(current_st, target_status)
        if decision != RuleDecision.ALLOW:
            logger.warning("Illegal transition rejected for event %s: %s -> %s", event_id, current_st, target_status.value)
            raise ValueError(
                f"Illegal procurement transition: Cannot advance milestone from {current_st} to {target_status.value}."
            )

        now = datetime.utcnow()
        event.status = target_status.value
        if remarks:
            event.remarks = remarks
        event.updated_at = now

        # Finalization states
        if target_status in (ProcurementStatus.PROCUREMENT_COMPLETED, ProcurementStatus.EXITED):
            event.completed_at = now

            if event.booking_id:
                booking = self.db.query(Booking).filter(Booking.id == event.booking_id).first()
                if booking:
                    booking.status = "SERVED"
                    booking.bay_number = None
                    booking.served_at = now
                    booking.payment_status = "CREDITED"
                    if not booking.payment_reference:
                        booking.payment_reference = f"PFMS{datetime.now().strftime('%Y%m%d%H%M%S')}"

                    # Ensure Procurement record exists
                    proc = self.db.query(Procurement).filter(Procurement.booking_id == booking.id).first()
                    if not proc:
                        net_qtl = booking.net_weight_quintals or booking.estimated_quantity or 50.0
                        msp = booking.commodity.minimum_support_price if booking.commodity else 2275.0
                        proc = Procurement(
                            booking_id=booking.id,
                            actual_quantity=net_qtl,
                            quality_grade="Grade FAQ A",
                            final_price=booking.payment_amount or (net_qtl * msp),
                            procurement_status="Completed",
                            procured_at=now,
                        )
                        self.db.add(proc)

        self.db.commit()
        self.db.refresh(event)

        # Audit transition
        action = (
            AUDIT_PROCUREMENT_COMPLETED
            if target_status == ProcurementStatus.PROCUREMENT_COMPLETED
            else f"MILESTONE_{target_status.value}"
        )
        self.audit_service.log_action(
            action=action,
            performed_by=operator_id,
            entity_type=ENTITY_PROCUREMENT_EVENT,
            entity_id=str(event.id),
            ip_address=ip_address,
            old_value={"status": current_st},
            new_value={"status": target_status.value, "remarks": remarks},
            remarks=f"Procurement milestone transitioned: {current_st} -> {target_status.value}",
        )

        return event

    def get_timeline(
        self,
        farmer_id: Optional[uuid.UUID] = None,
        booking_id: Optional[uuid.UUID] = None,
    ) -> List[ProcurementEvent]:
        """Retrieves chronological procurement timeline events."""
        query = self.db.query(ProcurementEvent)
        if farmer_id:
            query = query.filter(ProcurementEvent.farmer_id == farmer_id)
        if booking_id:
            query = query.filter(ProcurementEvent.booking_id == booking_id)
        return query.order_by(ProcurementEvent.created_at.asc()).all()
