"""FairProcure Fairness Telemetry Service.
Generates real-time mandi fairness metrics, live alerts feed, and dynamic 0-100 fairness score.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.constants.fairprocure import (
    AUDIT_DUPLICATE_PROCUREMENT_ATTEMPT,
    AUDIT_OVERRIDE_REQUESTED,
    AUDIT_POLICY_VIOLATION,
    AUDIT_QR_FAILED,
    AUDIT_QR_REVOKED,
    AUDIT_QR_VERIFIED,
    AUDIT_RULE_ENGINE_DENIED,
)
from app.core.enums.fairprocure import OverrideStatus, QRStatus
from app.models.audit_log import AuditLog
from app.models.bookings import Booking
from app.models.override_request import OverrideRequest
from app.models.procurement import Procurement
from app.models.qr_token import QRToken

logger = logging.getLogger("mandiq.fairprocure.fairness")


class FairnessService:
    """Computes live fairness governance telemetry and operational alerts."""

    def __init__(self, db: Session) -> None:
        """Initialize FairnessService with active database session."""
        self.db = db
        logger.debug("FairnessService initialized")

    def get_fairness_metrics(self) -> Dict[str, Any]:
        """Calculates comprehensive real-time fairness metrics for APMC dashboard."""
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # 1. Today's Procurements
        today_procurements = (
            self.db.query(func.count(Procurement.id))
            .filter(Procurement.procured_at >= today_start)
            .scalar()
            or 0
        )
        if today_procurements == 0:
            today_procurements = (
                self.db.query(func.count(Booking.id))
                .filter(Booking.status == "SERVED", Booking.served_at >= today_start)
                .scalar()
                or 0
            )

        # 2. Today's Overrides & Pending Overrides
        today_overrides = (
            self.db.query(func.count(OverrideRequest.id))
            .filter(OverrideRequest.created_at >= today_start)
            .scalar()
            or 0
        )
        pending_overrides = (
            self.db.query(func.count(OverrideRequest.id))
            .filter(
                (OverrideRequest.approval_status == OverrideStatus.PENDING.value)
                | (OverrideRequest.status == OverrideStatus.PENDING.value)
            )
            .scalar()
            or 0
        )

        # 3. Audit logs today
        today_audits = (
            self.db.query(AuditLog)
            .filter(AuditLog.created_at >= today_start)
            .all()
        )
        audit_events_today = len(today_audits)

        # 4. Denied Attempts, Queue Jumps, Early Attempts, Duplicate Procurements
        denied_attempts = 0
        queue_jump_attempts = 0
        early_arrival_attempts = 0
        duplicate_procurements = 0
        qr_verified_count = 0
        qr_failed_count = 0

        for a in today_audits:
            act = a.action or ""
            rem = (a.remarks or "").lower()
            val = a.new_value or {}

            if act in (AUDIT_RULE_ENGINE_DENIED, AUDIT_POLICY_VIOLATION):
                denied_attempts += 1
            if act == AUDIT_DUPLICATE_PROCUREMENT_ATTEMPT or "duplicate" in rem:
                duplicate_procurements += 1
                denied_attempts += 1
            if "queue jump" in rem or val.get("reason") == "QUEUE_JUMP_ATTEMPT":
                queue_jump_attempts += 1
            if "procurement_before_slot" in rem or val.get("reason") == "PROCUREMENT_BEFORE_SLOT" or "early" in rem:
                early_arrival_attempts += 1
            if act == AUDIT_QR_VERIFIED:
                qr_verified_count += 1
            if act == AUDIT_QR_FAILED:
                qr_failed_count += 1

        # 5. QR Rates
        total_qr_attempts = qr_verified_count + qr_failed_count
        if total_qr_attempts > 0:
            qr_success_rate = round((qr_verified_count / total_qr_attempts) * 100.0, 2)
            qr_failure_rate = round(100.0 - qr_success_rate, 2)
        else:
            qr_success_rate = 100.0
            qr_failure_rate = 0.0

        # 6. Average Waiting Time
        served_bookings = (
            self.db.query(Booking)
            .filter(Booking.status == "SERVED", Booking.served_at.isnot(None))
            .all()
        )
        waiting_times = []
        for b in served_bookings:
            if b.created_at and b.served_at:
                diff = (b.served_at - b.created_at).total_seconds() / 60.0
                if 0 < diff < 720:  # within 12 hours
                    waiting_times.append(diff)
        avg_waiting_time = round(sum(waiting_times) / len(waiting_times), 1) if waiting_times else 18.5

        # 7. Queue Compliance
        total_attempts = max(1, today_procurements + queue_jump_attempts)
        queue_compliance = round(max(0.0, min(100.0, 100.0 - (queue_jump_attempts / total_attempts) * 100.0)), 2)

        # 8. Fairness Score Formula (0 - 100)
        # Baseline = 100.0
        # Deduct:
        # - Queue jump attempts (-6 points each, max 30)
        # - Duplicate procurement attempts (-10 points each, max 30)
        # - Denied rule violations (-3 points each, max 20)
        # - Excessive unapproved / pending overrides (-2 points each)
        # - QR failure rate penalty (-0.5 points per % failure over 5%)
        penalties = 0.0
        penalties += min(30.0, queue_jump_attempts * 6.0)
        penalties += min(30.0, duplicate_procurements * 10.0)
        penalties += min(20.0, max(0, denied_attempts - queue_jump_attempts - duplicate_procurements) * 3.0)
        penalties += min(15.0, pending_overrides * 2.0)
        if qr_failure_rate > 5.0:
            penalties += min(10.0, (qr_failure_rate - 5.0) * 0.5)

        raw_score = 100.0 - penalties
        fairness_score = round(max(0.0, min(100.0, raw_score)), 1)

        return {
            "today_procurements": today_procurements,
            "today_overrides": today_overrides,
            "pending_overrides": pending_overrides,
            "denied_attempts": denied_attempts,
            "queue_jump_attempts": queue_jump_attempts,
            "early_arrival_attempts": early_arrival_attempts,
            "average_waiting_time_minutes": avg_waiting_time,
            "qr_success_rate": qr_success_rate,
            "qr_failure_rate": qr_failure_rate,
            "queue_compliance": queue_compliance,
            "fairness_score": fairness_score,
            "audit_events_today": audit_events_today,
            "timestamp": now.isoformat(),
        }

    def get_live_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Returns ordered stream of critical fair procurement alerts, newest first."""
        alerts: List[Dict[str, Any]] = []
        now = datetime.utcnow()

        # 1. Pending Overrides (HIGH severity)
        pending = (
            self.db.query(OverrideRequest)
            .filter(
                (OverrideRequest.approval_status == OverrideStatus.PENDING.value)
                | (OverrideRequest.status == OverrideStatus.PENDING.value)
            )
            .order_by(OverrideRequest.created_at.desc())
            .limit(limit)
            .all()
        )
        for p in pending:
            alerts.append({
                "id": str(p.id),
                "type": "PENDING_OVERRIDE",
                "severity": "HIGH",
                "title": "Supervisor Approval Pending",
                "message": f"Override requested for {p.farmer_name or f'Token {p.token_number}'}: {p.reason}",
                "entity_type": "OVERRIDE_REQUEST",
                "entity_id": str(p.id),
                "created_at": p.created_at.isoformat() if p.created_at else now.isoformat(),
            })

        # 2. Audit logs for Queue Jumps, Early Arrivals, QR Failures, Duplicates
        audits = (
            self.db.query(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .all()
        )
        for a in audits:
            act = a.action or ""
            rem = a.remarks or ""
            val = a.new_value or {}
            reason = val.get("reason", "")

            if reason == "QUEUE_JUMP_ATTEMPT" or "queue jump" in rem.lower():
                alerts.append({
                    "id": str(a.id),
                    "type": "QUEUE_JUMP_ATTEMPT",
                    "severity": "CRITICAL",
                    "title": "Queue Jump Blocked",
                    "message": rem or "Out-of-turn procurement attempt blocked by Rule Engine.",
                    "entity_type": a.entity_type,
                    "entity_id": a.entity_id,
                    "created_at": a.created_at.isoformat() if a.created_at else now.isoformat(),
                })
            elif reason == "PROCUREMENT_BEFORE_SLOT" or "early" in rem.lower():
                alerts.append({
                    "id": str(a.id),
                    "type": "EARLY_PROCUREMENT_ATTEMPT",
                    "severity": "MEDIUM",
                    "title": "Early Arrival Attempt",
                    "message": rem or "Farmer arrived before permitted slot buffer window.",
                    "entity_type": a.entity_type,
                    "entity_id": a.entity_id,
                    "created_at": a.created_at.isoformat() if a.created_at else now.isoformat(),
                })
            elif act == AUDIT_DUPLICATE_PROCUREMENT_ATTEMPT or "duplicate" in rem.lower():
                alerts.append({
                    "id": str(a.id),
                    "type": "DUPLICATE_PROCUREMENT",
                    "severity": "CRITICAL",
                    "title": "Duplicate Procurement Blocked",
                    "message": rem or "Attempted re-procurement on an already served token.",
                    "entity_type": a.entity_type,
                    "entity_id": a.entity_id,
                    "created_at": a.created_at.isoformat() if a.created_at else now.isoformat(),
                })
            elif act == AUDIT_POLICY_VIOLATION:
                alerts.append({
                    "id": str(a.id),
                    "type": "POLICY_VIOLATION",
                    "severity": "HIGH",
                    "title": "Security Policy Violation",
                    "message": rem or "Mandi governance policy violation detected.",
                    "entity_type": a.entity_type,
                    "entity_id": a.entity_id,
                    "created_at": a.created_at.isoformat() if a.created_at else now.isoformat(),
                })
            elif act == AUDIT_QR_FAILED:
                alerts.append({
                    "id": str(a.id),
                    "type": "REPEATED_QR_FAILURE",
                    "severity": "HIGH",
                    "title": "QR Identity Verification Failed",
                    "message": rem or "Gate scanner detected invalid or tampered QR pass.",
                    "entity_type": a.entity_type,
                    "entity_id": a.entity_id,
                    "created_at": a.created_at.isoformat() if a.created_at else now.isoformat(),
                })
            elif act == AUDIT_QR_REVOKED:
                alerts.append({
                    "id": str(a.id),
                    "type": "REVOKED_QR",
                    "severity": "HIGH",
                    "title": "Revoked QR Identity",
                    "message": rem or "Farmer QR token has been revoked by APMC administrator.",
                    "entity_type": a.entity_type,
                    "entity_id": a.entity_id,
                    "created_at": a.created_at.isoformat() if a.created_at else now.isoformat(),
                })

        # Sort combined alerts by created_at descending
        alerts.sort(key=lambda x: x["created_at"], reverse=True)
        return alerts[:limit]
