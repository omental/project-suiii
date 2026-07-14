from __future__ import annotations

from datetime import date, datetime
from typing import Any

from sqlalchemy import Date, DateTime, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import UserScopedMixin


class WorkoutSession(UserScopedMixin, Base):
    __tablename__ = "workout_sessions"
    __table_args__ = (
        UniqueConstraint("user_id", "client_record_id", name="uq_workout_sessions_user_client_record"),
        Index("ix_workout_sessions_user_local_date", "user_id", "local_date"),
        Index("ix_workout_sessions_user_updated_at", "user_id", "updated_at"),
    )

    client_record_id: Mapped[str] = mapped_column(String(180), nullable=False)
    local_date: Mapped[date] = mapped_column(Date, nullable=False)
    workout_definition_id: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
