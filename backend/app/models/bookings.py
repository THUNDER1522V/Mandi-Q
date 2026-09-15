from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, CheckConstraint, Float, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Booking(Base):
    __tablename__ = "bookings"

    __table_args__ = (
        CheckConstraint(
            "estimated_quantity > 0",
            name="ck_estimated_quantity_positive"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    farmer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("farmers.id"),
        nullable=False
    )

    commodity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("commodities.id"),
        nullable=False
    )

    booking_date: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        index=True
    )

    booking_slot: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    estimated_quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="Booked",
        index=True
    )

    # Operational procurement fields for Live Mandi execution
    bay_number: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        index=True
    )

    vehicle_type: Mapped[str] = mapped_column(
        String(50),
        default="Tractor Trolley",
        nullable=True
    )

    vehicle_number: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    booked_via: Mapped[str] = mapped_column(
        String(50),
        default="Voice (Sarvam AI)",
        nullable=True
    )

    booking_timestamp: Mapped[str] = mapped_column(
        String(20),
        default="08:00 AM",
        nullable=True
    )

    served_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    moisture_pct: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    gross_weight_kg: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    tare_weight_kg: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    net_weight_quintals: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    payment_status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING",
        nullable=True
    )

    payment_amount: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    payment_reference: Mapped[str | None] = mapped_column(
        String(60),
        nullable=True
    )

    payment_time: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
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

    # Relationships
    farmer = relationship(
        "Farmer",
        back_populates="bookings"
    )

    commodity = relationship(
        "Commodity",
        back_populates="bookings"
    )

    token = relationship(
        "Token",
        back_populates="booking",
        uselist=False
    )

    procurement = relationship(
        "Procurement",
        back_populates="booking",
        uselist=False
    )

    procurement_events = relationship(
        "ProcurementEvent",
        back_populates="booking"
    )

    override_requests = relationship(
        "OverrideRequest",
        back_populates="booking"
    )