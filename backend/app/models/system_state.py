from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class SystemState(Base):
    __tablename__ = "system_state"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    is_halted: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )

    halt_reason: Mapped[str] = mapped_column(
        String(255),
        default=""
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )