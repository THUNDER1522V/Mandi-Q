from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Token(Base):
    __tablename__ = "tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id"),
        nullable=False
    )

    token_number: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        index=True,
        nullable=False
    )

    queue_position: Mapped[int] = mapped_column(
        Integer,
        index=True,
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="Waiting"
    )

    estimated_arrival: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    booking = relationship("Booking", back_populates="token")
    procurement_events = relationship("ProcurementEvent", back_populates="token", foreign_keys="ProcurementEvent.queue_id")