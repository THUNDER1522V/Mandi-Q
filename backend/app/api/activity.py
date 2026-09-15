import logging
from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models import ActivityLog, AuditLog

logger = logging.getLogger("mandiq.activity")

router = APIRouter(prefix="", tags=["Activity & Audit"])


@router.get("/activity-logs", summary="Get real-time activity stream events")
def get_activity_logs_api(limit: int = 50, db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    logs = (
        db.query(ActivityLog)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": str(log.id),
            "timestamp": log.created_at.strftime("%H:%M:%S") if log.created_at else "00:00:00",
            "title": log.title,
            "detail": log.detail,
            "type": log.event_type,
        }
        for log in logs
    ]


@router.get("/audit-events", summary="Get official APMC audit log records")
def get_audit_events_api(limit: int = 50, db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": str(log.id),
            "timestamp": log.created_at.strftime("%I:%M %p") if log.created_at else "00:00 AM",
            "action": log.action,
            "performed_by": log.performed_by,
            "details": log.details,
        }
        for log in logs
    ]
