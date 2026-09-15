from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class ProcurementEvent(Base):
    __tablename__ = "procurement_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    farmer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("farmers.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    booking_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    queue_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tokens.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    started_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    # Full Procurement Lifecycle Milestones:
    # ARRIVED, QR_VERIFIED, QUEUE_ENTERED, WAITING, WEIGHMENT_STARTED,
    # WEIGHMENT_COMPLETED, PROCUREMENT_STARTED, PROCUREMENT_COMPLETED,
    # PAYMENT_INITIATED, PAYMENT_COMPLETED, EXITED, CANCELLED, FAILED, INITIATED
    status: Mapped[str] = mapped_column(
        String(50),
        default="ARRIVED",
        index=True,
        nullable=False,
    )

    remarks: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_by: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        index=True,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Relationships: Farmer -> Booking -> Queue (Token) -> Procurement Event
    farmer = relationship("Farmer", back_populates="procurement_events")
    booking = relationship("Booking", back_populates="procurement_events")
    token = relationship("Token", back_populates="procurement_events", foreign_keys=[queue_id])
    queue = relationship("Token", foreign_keys=[queue_id], viewonly=True)
