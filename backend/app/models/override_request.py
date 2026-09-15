from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class OverrideRequest(Base):
    __tablename__ = "override_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    farmer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("farmers.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    booking_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    reason: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    requested_by: Mapped[str] = mapped_column(
        String(100),
        default="Gate Security Officer",
        nullable=False,
    )

    approved_by: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    approval_status: Mapped[str] = mapped_column(
        String(30),
        default="PENDING",
        index=True,
        nullable=False,
    )

    # Authorization method: PIN, OTP, QR, BIOMETRIC, SYSTEM
    approval_method: Mapped[str] = mapped_column(
        String(20),
        default="PIN",
        server_default="PIN",
        index=True,
        nullable=False,
    )

    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime,
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

    # Operational & backward compatibility fields
    token_number: Mapped[int | None] = mapped_column(
        Integer,
        index=True,
        nullable=True,
    )

    farmer_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    authorized_by: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    qr_hash: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
    )

    status: Mapped[str | None] = mapped_column(
        String(30),
        default="PENDING",
        nullable=True,
    )

    # Relationships
    farmer = relationship("Farmer", back_populates="override_requests")
    booking = relationship("Booking", back_populates="override_requests")
