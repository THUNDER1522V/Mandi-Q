from __future__ import annotations

from datetime import datetime
from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class WeighbridgeBay(Base):
    __tablename__ = "weighbridge_bays"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    bay_number: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        index=True,
        nullable=False
    )

    bay_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    scale_type: Mapped[str] = mapped_column(
        String(100),
        default="Gross / Tare Electronic Scale"
    )

    capacity_tons: Mapped[int] = mapped_column(
        Integer,
        default=60
    )

    operator_name: Mapped[str] = mapped_column(
        String(100),
        default="APMC Weighbridge Officer"
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="READY"
    )

    current_token: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
