from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Procurement(Base):
    __tablename__ = "procurements"

    __table_args__ = (
        CheckConstraint(
            "actual_quantity >= 0",
            name="ck_actual_quantity_positive"
        ),
    )

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

    actual_quantity: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    quality_grade: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    final_price: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    procurement_status: Mapped[str] = mapped_column(
        String(20),
        default="Completed"
    )

    procured_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    # Relationship
    booking = relationship(
        "Booking",
        back_populates="procurement"
    )