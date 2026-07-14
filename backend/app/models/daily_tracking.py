from __future__ import annotations

from datetime import date

from sqlalchemy import Date, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import UserScopedMixin


class DailyTracking(UserScopedMixin, Base):
    __tablename__ = "daily_tracking"
    __table_args__ = (UniqueConstraint("user_id", "tracking_date", name="uq_daily_tracking_user_date"),)

    tracking_date: Mapped[date] = mapped_column(Date, nullable=False)
    water_ml: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cigarettes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sleep_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    badminton_games: Mapped[int | None] = mapped_column(Integer, nullable=True)
    energy: Mapped[str | None] = mapped_column(String(24), nullable=True)
    soreness: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
