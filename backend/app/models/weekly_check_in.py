from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WeeklyCheckIn(Base):
    __tablename__ = "weekly_check_ins"
    __table_args__ = (
        CheckConstraint("status in ('draft', 'completed')", name="ck_weekly_check_ins_status"),
        CheckConstraint("energy is null or energy in ('low', 'normal', 'high')", name="ck_weekly_check_ins_energy"),
        CheckConstraint("hunger is null or hunger in ('low', 'normal', 'high')", name="ck_weekly_check_ins_hunger"),
        CheckConstraint("digestion is null or digestion in ('good', 'some_gas', 'difficult')", name="ck_weekly_check_ins_digestion"),
        UniqueConstraint("user_id", "client_record_id", name="uq_weekly_check_ins_user_client_record"),
        Index("ix_weekly_check_ins_user_week_status", "user_id", "week_number", "status"),
        Index(
            "uq_weekly_check_ins_user_completed_week",
            "user_id",
            "week_number",
            unique=True,
            postgresql_where="status = 'completed' AND deleted_at IS NULL",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    client_record_id: Mapped[str] = mapped_column(String(180), nullable=False)
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)
    check_in_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="draft", server_default="draft")
    energy: Mapped[str | None] = mapped_column(String(24), nullable=True)
    hunger: Mapped[str | None] = mapped_column(String(24), nullable=True)
    digestion: Mapped[str | None] = mapped_column(String(24), nullable=True)
    average_sleep_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    private_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    measurement_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("body_measurements.id", ondelete="SET NULL"), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
