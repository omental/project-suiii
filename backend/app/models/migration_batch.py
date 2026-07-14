from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MigrationBatch(Base):
    __tablename__ = "migration_batches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id: Mapped[str] = mapped_column(String(180), nullable=False)
    conflict_policy: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    total_records: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    imported_records: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    skipped_records: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    conflict_records: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_records: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    summary: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
