from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from sqlalchemy.orm import relationship


class VoiceCall(Base):
    __tablename__ = "voice_calls"

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
    farmer = relationship(
        "Farmer",
        back_populates="voice_calls"
    )

    call_sid: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False
    )

    language: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    intent: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    transcript: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    call_status: Mapped[str] = mapped_column(
        String(30),
        default="Completed"
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

    