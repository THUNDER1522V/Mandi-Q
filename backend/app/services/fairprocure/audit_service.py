"""FairProcure Audit Service.
Handles immutable recording of sensitive actions with JSONB state snapshots and device tracking.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog

logger = logging.getLogger("mandiq.fairprocure.audit")


class AuditService:
    """Enterprise audit logger ensuring non-repudiation for all sensitive mandi actions."""

    def __init__(self, db: Session) -> None:
        """Initialize AuditService with database session.

        Args:
            db: Active SQLAlchemy database session.
        """
        self.db = db
        logger.debug("AuditService initialized")

    def log_action(
        self,
        action: str,
        performed_by: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        old_value: Optional[Dict[str, Any]] = None,
        new_value: Optional[Dict[str, Any]] = None,
        remarks: Optional[str] = None,
        device_id: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        """Appends an immutable audit log entry into PostgreSQL.

        Args:
            action: Standard audit action identifier.
            performed_by: Staff username or authenticated system agent.
            entity_type: Target domain category (FARMER, QUEUE, OVERRIDE, etc.).
            entity_id: Target record UUID or primary key.
            old_value: State prior to execution.
            new_value: State after execution.
            remarks: Human-readable context or explanation.
            device_id: Physical scanner or terminal hardware identifier.
            ip_address: Client or terminal IP address if available.

        Returns:
            Newly created and persisted AuditLog record.
        """
        logger.info(
            "Audit event: action=%s by=%s entity=%s:%s device=%s ip=%s",
            action, performed_by, entity_type, entity_id, device_id, ip_address
        )
        audit = AuditLog(
            action=action,
            performed_by=performed_by,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            old_value=old_value,
            new_value=new_value,
            remarks=remarks,
            details=remarks or f"Action {action} performed on {entity_type}:{entity_id}",
            device_id=device_id,
            ip_address=ip_address,
            created_at=datetime.utcnow(),
        )
        self.db.add(audit)
        self.db.commit()
        self.db.refresh(audit)
        return audit

    def get_entity_history(
        self,
        entity_type: str,
        entity_id: str,
        limit: int = 50,
    ) -> List[AuditLog]:
        """Retrieves chronological audit trail for a specific entity.

        Args:
            entity_type: Domain category.
            entity_id: Specific entity identifier.
            limit: Maximum items to retrieve.

        Returns:
            List of AuditLog entries ordered newest first.
        """
        logger.debug("Fetching audit history for %s:%s", entity_type, entity_id)
        return (
            self.db.query(AuditLog)
            .filter(AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_recent_audits(
        self,
        action: Optional[str] = None,
        limit: int = 50,
    ) -> List[AuditLog]:
        """Retrieves global recent audit activity feed.

        Args:
            action: Optional filter by specific action.
            limit: Maximum items to retrieve.

        Returns:
            List of AuditLog records.
        """
        query = self.db.query(AuditLog)
        if action:
            query = query.filter(AuditLog.action == action)
        return query.order_by(AuditLog.created_at.desc()).limit(limit).all()
