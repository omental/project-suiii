from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import UserScopedMixin


class GeneratedReport(UserScopedMixin, Base):
    __tablename__ = "generated_reports"
    __table_args__ = (
        UniqueConstraint("user_id", "report_type", "period_start", "period_end", name="uq_generated_reports_user_type_period"),
        Index("ix_generated_reports_user_created_at", "user_id", "created_at"),
    )

    report_type: Mapped[str] = mapped_column(String(24), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    storage_key: Mapped[str] = mapped_column(String(240), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="generated", server_default="generated")
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
