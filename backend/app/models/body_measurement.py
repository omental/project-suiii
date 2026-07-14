from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, Index, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import UserScopedMixin


class BodyMeasurement(UserScopedMixin, Base):
    __tablename__ = "body_measurements"
    __table_args__ = (
        CheckConstraint(
            "weight_kg IS NOT NULL OR waist_in IS NOT NULL OR chest_in IS NOT NULL OR arm_in IS NOT NULL OR thigh_in IS NOT NULL",
            name="ck_body_measurements_one_value",
        ),
        CheckConstraint("weight_kg IS NULL OR (weight_kg > 20 AND weight_kg < 350)", name="ck_body_measurements_weight_bounds"),
        CheckConstraint("waist_in IS NULL OR (waist_in > 10 AND waist_in < 100)", name="ck_body_measurements_waist_bounds"),
        CheckConstraint("chest_in IS NULL OR (chest_in > 10 AND chest_in < 100)", name="ck_body_measurements_chest_bounds"),
        CheckConstraint("arm_in IS NULL OR (arm_in > 4 AND arm_in < 40)", name="ck_body_measurements_arm_bounds"),
        CheckConstraint("thigh_in IS NULL OR (thigh_in > 8 AND thigh_in < 60)", name="ck_body_measurements_thigh_bounds"),
        UniqueConstraint("user_id", "client_record_id", name="uq_body_measurements_user_client_record"),
        Index("ix_body_measurements_user_measured_at", "user_id", "measured_at"),
        Index("ix_body_measurements_user_local_date", "user_id", "local_date"),
    )

    client_record_id: Mapped[str] = mapped_column(String(180), nullable=False)
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    local_date: Mapped[date] = mapped_column(Date, nullable=False)
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    waist_in: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    chest_in: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    arm_in: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    thigh_in: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    source: Mapped[str] = mapped_column(String(24), nullable=False, default="manual", server_default="manual")
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
