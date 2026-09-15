from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship, foreign

from app.database.base import Base


class Farmer(Base):
    __tablename__ = "farmers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    farmer_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    phone_number: Mapped[str] = mapped_column(
        String(15),
        unique=True,
        index=True,
        nullable=False
    )

    village: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    district: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    state: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    preferred_language: Mapped[str] = mapped_column(
        String(30),
        default="Hindi"
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

    bookings = relationship(
        "Booking",
        back_populates="farmer"
    )

    voice_calls = relationship(
        "VoiceCall",
        back_populates="farmer"
    )

    notifications = relationship(
        "Notification",
        back_populates="farmer"
    )

    # FairProcure Relationships
    qr_token = relationship(
        "QRToken",
        primaryjoin="and_(Farmer.id == foreign(QRToken.farmer_id), QRToken.is_active.is_(True))",
        uselist=False,
        viewonly=True,
    )

    qr_tokens = relationship(
        "QRToken",
        primaryjoin="Farmer.id == foreign(QRToken.farmer_id)",
        order_by="desc(QRToken.version)",
        back_populates="farmer",
        cascade="all, delete-orphan",
    )

    procurement_events = relationship(
        "ProcurementEvent",
        back_populates="farmer",
        cascade="all, delete-orphan"
    )

    override_requests = relationship(
        "OverrideRequest",
        back_populates="farmer"
    )