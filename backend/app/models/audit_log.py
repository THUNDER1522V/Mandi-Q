from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    entity_type: Mapped[str | None] = mapped_column(
        String(50),
        index=True,
        nullable=True,
    )

    entity_id: Mapped[str | None] = mapped_column(
        String(100),
        index=True,
        nullable=True,
    )

    action: Mapped[str] = mapped_column(
        String(100),
        index=True,
        nullable=False,
    )

    performed_by: Mapped[str] = mapped_column(
        String(100),
        index=True,
        nullable=False,
    )

    # Hardware device or kiosk identifier (e.g. Weighbridge Terminal, Gate Scanner)
    device_id: Mapped[str | None] = mapped_column(
        String(100),
        index=True,
        nullable=True,
    )

    # Client IP address if available
    ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
    )

    old_value: Mapped[Dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    new_value: Mapped[Dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    remarks: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Backward-compatible column for legacy activity/audit logs
    details: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        index=True,
        nullable=False,
    )

    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=True,
    )