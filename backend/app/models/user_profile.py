from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    height_cm: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("180"))
    starting_weight_kg: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("79"))
    target_weight_min_kg: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("73"))
    target_weight_max_kg: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("74"))
    starting_waist_in: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("38.5"))
    target_waist_in: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("35"))
    calorie_target: Mapped[int] = mapped_column(Integer, nullable=False, default=2200)
    protein_target_g: Mapped[int] = mapped_column(Integer, nullable=False, default=145)
    water_target_ml: Mapped[int] = mapped_column(Integer, nullable=False, default=3000)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="Asia/Dhaka")
    programme_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
