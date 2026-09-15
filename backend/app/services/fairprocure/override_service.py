"""FairProcure Override Service.
Governs exceptional out-of-turn procurement requests with supervisor dual-authorization.
"""
from __future__ import annotations

import hashlib
import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.constants.fairprocure import (
    AUDIT_OVERRIDE_APPROVED,
    AUDIT_OVERRIDE_REJECTED,
    AUDIT_OVERRIDE_REQUESTED,
    AUDIT_POLICY_VIOLATION,
    DEFAULT_SUPERVISOR_PIN,
    ENTITY_OVERRIDE_REQUEST,
    POLICY_SUPERVISOR_PIN,
)
from app.core.enums.fairprocure import ApprovalMethod, OverrideStatus
from app.models.activity_log import ActivityLog
from app.models.bookings import Booking
from app.models.farmer import Farmer
from app.models.override_request import OverrideRequest
from app.models.token import Token
from app.services.fairprocure.audit_service import AuditService
from app.services.fairprocure.policy_service import PolicyService

logger = logging.getLogger("mandiq.fairprocure.override")


class OverrideService:
    """Enterprise service managing exceptional early intake authorization workflows."""

    def __init__(self, db: Session) -> None:
        """Initialize OverrideService with database session."""
        self.db = db
        self.audit_service = AuditService(db)
        self.policy_service = PolicyService(db)
        logger.debug("OverrideService initialized")

    def request_override(
        self,
        reason: str,
        farmer_id: Optional[uuid.UUID] = None,
        booking_id: Optional[uuid.UUID] = None,
        token_number: Optional[int] = None,
        requested_by: str = "Gate Security Officer",
    ) -> OverrideRequest:
        """Creates an unapproved override request awaiting supervisor review.

        Args:
            reason: Justification (e.g. Perishable crop damage risk, rain).
            farmer_id: Target farmer UUID.
            booking_id: Associated booking UUID.
            token_number: Associated token number.
            requested_by: Field gate personnel submitting request.

        Returns:
            Pending OverrideRequest entity.
        """
        logger.info("Override submitted by %s for farmer=%s booking=%s: %s", requested_by, farmer_id, booking_id, reason)
        now = datetime.utcnow()
        farmer_name = None

        # Resolve relations if partial parameters provided
        if token_number and not booking_id:
            token = self.db.query(Token).filter(Token.token_number == token_number).first()
            if token and token.booking_id:
                booking_id = token.booking_id

        if booking_id:
            booking = self.db.query(Booking).filter(Booking.id == booking_id).first()
            if booking:
                if not farmer_id and booking.farmer_id:
                    farmer_id = booking.farmer_id
                if not token_number and booking.token:
                    token_number = booking.token.token_number

        if farmer_id:
            farmer = self.db.query(Farmer).filter(Farmer.id == farmer_id).first()
            if farmer:
                farmer_name = farmer.farmer_name

        req = OverrideRequest(
            farmer_id=farmer_id,
            booking_id=booking_id,
            token_number=token_number,
            farmer_name=farmer_name,
            reason=reason,
            requested_by=requested_by,
            approval_status=OverrideStatus.PENDING.value,
            approval_method=ApprovalMethod.PIN.value,
            status=OverrideStatus.PENDING.value,
            created_at=now,
            updated_at=now,
        )
        self.db.add(req)
        self.db.commit()
        self.db.refresh(req)

        # 1. Immutable Audit Log
        self.audit_service.log_action(
            action=AUDIT_OVERRIDE_REQUESTED,
            performed_by=requested_by,
            entity_type=ENTITY_OVERRIDE_REQUEST,
            entity_id=str(req.id),
            new_value={
                "farmer_id": str(farmer_id) if farmer_id else None,
                "booking_id": str(booking_id) if booking_id else None,
                "token_number": token_number,
                "reason": reason,
                "status": OverrideStatus.PENDING.value,
            },
            remarks=f"Override requested for Farmer {farmer_name or token_number}: {reason}",
        )

        # 2. Activity Log ticker
        tok_str = f"TK-{str(token_number).zfill(3)}" if token_number else "Gate Pass"
        self.db.add(
            ActivityLog(
                title=f"Override Requested · {tok_str}",
                detail=f"{farmer_name or 'Farmer'} requested out-of-turn intake: {reason}",
                event_type="override",
                created_at=now,
            )
        )
        self.db.commit()

        return req

    def approve_override(
        self,
        override_id: uuid.UUID,
        supervisor_id: str,
        pin: str,
        supervisor_name: str = "APMC Mandi Secretary",
        method: ApprovalMethod = ApprovalMethod.PIN,
    ) -> OverrideRequest:
        """Authorizes early intake with cryptographic supervisor signature after PIN verification.

        Args:
            override_id: UUID of the pending request.
            supervisor_id: Employee ID of the supervisor.
            pin: Master supervisor PIN code.
            supervisor_name: Display name of the supervisor.
            method: Method used to verify supervisor presence (PIN, OTP, BIOMETRIC).

        Returns:
            Approved OverrideRequest record.

        Raises:
            KeyError: If override request not found.
            ValueError: If supervisor PIN is invalid.
        """
        logger.info("Approving override %s by %s via %s", override_id, supervisor_name, method.value)
        req = self.db.query(OverrideRequest).filter(OverrideRequest.id == override_id).first()
        if not req:
            raise KeyError(f"OverrideRequest {override_id} not found")

        # Validate supervisor PIN
        expected_pin = self.policy_service.get_str(POLICY_SUPERVISOR_PIN, default=DEFAULT_SUPERVISOR_PIN)
        if pin.strip() != expected_pin.strip():
            logger.warning("Invalid supervisor PIN attempted by %s for override %s", supervisor_id, override_id)
            self.audit_service.log_action(
                action=AUDIT_POLICY_VIOLATION,
                performed_by=supervisor_id,
                entity_type=ENTITY_OVERRIDE_REQUEST,
                entity_id=str(override_id),
                remarks=f"Failed supervisor PIN verification attempt by {supervisor_id}",
            )
            raise ValueError("Invalid supervisor PIN. Dual-authorization failed.")

        now = datetime.utcnow()
        old_status = req.approval_status

        # Generate cryptographic tamper-evident proof hash
        raw_proof = f"{req.id}:{req.token_number}:{supervisor_id}:{now.isoformat()}:{req.reason}"
        proof_hash = hashlib.sha256(raw_proof.encode()).hexdigest()

        req.approved_by = f"{supervisor_name} ({supervisor_id})"
        req.authorized_by = req.approved_by
        req.approval_status = OverrideStatus.APPROVED.value
        req.status = OverrideStatus.APPROVED.value
        req.approval_method = method.value
        req.approved_at = now
        req.qr_hash = proof_hash
        req.updated_at = now

        self.db.commit()
        self.db.refresh(req)

        # 1. Immutable Audit Log
        self.audit_service.log_action(
            action=AUDIT_OVERRIDE_APPROVED,
            performed_by=f"{supervisor_name} ({supervisor_id})",
            entity_type=ENTITY_OVERRIDE_REQUEST,
            entity_id=str(req.id),
            old_value={"approval_status": old_status},
            new_value={
                "approval_status": OverrideStatus.APPROVED.value,
                "approved_by": req.approved_by,
                "approval_method": method.value,
                "proof_hash": proof_hash,
            },
            remarks=f"Supervisor override approved for {req.farmer_name or req.token_number}: {req.reason}",
        )

        # 2. Activity Log ticker
        tok_str = f"TK-{str(req.token_number).zfill(3)}" if req.token_number else "Pass"
        self.db.add(
            ActivityLog(
                title=f"Override Approved · {tok_str}",
                detail=f"Authorized by {supervisor_name} · Reason: {req.reason}",
                event_type="override",
                created_at=now,
            )
        )
        self.db.commit()

        return req

    def reject_override(
        self,
        override_id: uuid.UUID,
        supervisor_id: str,
        reason: str,
    ) -> OverrideRequest:
        """Rejects early intake request.

        Args:
            override_id: UUID of request.
            supervisor_id: Supervisor refusing approval.
            reason: Explanation for refusal.

        Returns:
            Rejected OverrideRequest record.
        """
        logger.warning("Rejecting override %s by %s: %s", override_id, supervisor_id, reason)
        req = self.db.query(OverrideRequest).filter(OverrideRequest.id == override_id).first()
        if not req:
            raise KeyError(f"OverrideRequest {override_id} not found")

        now = datetime.utcnow()
        old_status = req.approval_status

        req.approved_by = supervisor_id
        req.authorized_by = supervisor_id
        req.approval_status = OverrideStatus.REJECTED.value
        req.status = OverrideStatus.REJECTED.value
        req.updated_at = now

        self.db.commit()
        self.db.refresh(req)

        # 1. Immutable Audit Log
        self.audit_service.log_action(
            action=AUDIT_OVERRIDE_REJECTED,
            performed_by=supervisor_id,
            entity_type=ENTITY_OVERRIDE_REQUEST,
            entity_id=str(req.id),
            old_value={"approval_status": old_status},
            new_value={
                "approval_status": OverrideStatus.REJECTED.value,
                "rejected_by": supervisor_id,
                "rejection_reason": reason,
            },
            remarks=f"Supervisor override rejected: {reason}",
        )

        return req

    def get_pending_overrides(self) -> List[OverrideRequest]:
        """Fetches all pending override requests awaiting supervisor action.

        Returns:
            List of pending OverrideRequest entries.
        """
        return (
            self.db.query(OverrideRequest)
            .filter(
                (OverrideRequest.approval_status == OverrideStatus.PENDING.value)
                | (OverrideRequest.status == OverrideStatus.PENDING.value)
            )
            .order_by(OverrideRequest.created_at.asc())
            .all()
        )

    def get_override_history(self, limit: int = 100) -> List[OverrideRequest]:
        """Fetches chronological override history.

        Returns:
            List of all OverrideRequest entries, newest first.
        """
        return (
            self.db.query(OverrideRequest)
            .order_by(OverrideRequest.created_at.desc())
            .limit(limit)
            .all()
        )

    def has_active_approved_override(
        self,
        booking_id: Optional[uuid.UUID] = None,
        farmer_id: Optional[uuid.UUID] = None,
        token_number: Optional[int] = None,
    ) -> Optional[OverrideRequest]:
        """Checks if there is an approved override granted within the last 24 hours."""
        cutoff = datetime.utcnow() - timedelta(hours=24)
        query = self.db.query(OverrideRequest).filter(
            OverrideRequest.approval_status == OverrideStatus.APPROVED.value,
            OverrideRequest.created_at >= cutoff,
        )

        if booking_id:
            match = query.filter(OverrideRequest.booking_id == booking_id).first()
            if match:
                return match

        if token_number:
            match = query.filter(OverrideRequest.token_number == token_number).first()
            if match:
                return match

        if farmer_id:
            match = query.filter(OverrideRequest.farmer_id == farmer_id).first()
            if match:
                return match

        return None
