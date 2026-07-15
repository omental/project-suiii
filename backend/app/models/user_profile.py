from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    height_cm: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("170"))
    starting_weight_kg: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("70"))
    target_weight_min_kg: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("65"))
    target_weight_max_kg: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("70"))
    starting_waist_in: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("34"))
    target_waist_in: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=Decimal("32"))
    calorie_target: Mapped[int] = mapped_column(Integer, nullable=False, default=2000)
    protein_target_g: Mapped[int] = mapped_column(Integer, nullable=False, default=120)
    water_target_ml: Mapped[int] = mapped_column(Integer, nullable=False, default=2500)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="Asia/Dhaka")
    unit_system: Mapped[str] = mapped_column(String(16), nullable=False, default="metric")
    programme_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    profile_configured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    preferred_rest_day: Mapped[str | None] = mapped_column(String(16), nullable=True)
    preferred_workout_time: Mapped[str | None] = mapped_column(String(8), nullable=True)
    equipment_csv: Mapped[str | None] = mapped_column(String(512), nullable=True)
    badminton_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    badminton_days_csv: Mapped[str | None] = mapped_column(String(128), nullable=True)
    badminton_start_time: Mapped[str | None] = mapped_column(String(8), nullable=True)
    badminton_end_time: Mapped[str | None] = mapped_column(String(8), nullable=True)
    badminton_intensity: Mapped[str | None] = mapped_column(String(16), nullable=True)
    show_exercise_illustrations: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    rest_timer_sound: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    default_rest_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    exercise_substitutions_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    planned_meals: Mapped[int | None] = mapped_column(Integer, nullable=True)
    kitchen_scale_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    measurement_unit: Mapped[str] = mapped_column(String(16), nullable=False, default="metric")
    meal_reminders_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sleep_target_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    readiness_check_in_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    weekly_check_in_day: Mapped[str | None] = mapped_column(String(16), nullable=True)
    smoking_tracking_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    cigarette_baseline: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cigarette_reduction_target: Mapped[int | None] = mapped_column(Integer, nullable=True)
    first_cigarette_delay_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
