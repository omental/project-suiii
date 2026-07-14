from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import DateTime, Index, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import UserScopedMixin


class ProgressMilestone(UserScopedMixin, Base):
    __tablename__ = "progress_milestones"
    __table_args__ = (
        UniqueConstraint("user_id", "milestone_type", "threshold_value", name="uq_progress_milestones_user_type_threshold"),
        Index("ix_progress_milestones_user_achieved_at", "user_id", "achieved_at"),
    )

    milestone_type: Mapped[str] = mapped_column(String(80), nullable=False)
    threshold_value: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    achieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    extra_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, nullable=False, default=dict)
