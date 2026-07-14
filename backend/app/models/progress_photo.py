from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ProgressPhoto(Base):
    __tablename__ = "progress_photos"
    __table_args__ = (
        CheckConstraint("pose in ('front', 'side', 'back')", name="ck_progress_photos_pose"),
        CheckConstraint("width > 0 AND height > 0 AND size_bytes > 0", name="ck_progress_photos_positive_media"),
        Index(
            "uq_progress_photos_user_check_in_pose_active",
            "user_id",
            "check_in_id",
            "pose",
            unique=True,
            postgresql_where="deleted_at IS NULL",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    check_in_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("weekly_check_ins.id", ondelete="CASCADE"), nullable=False, index=True)
    pose: Mapped[str] = mapped_column(String(12), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(240), nullable=False)
    processed_mime_type: Mapped[str] = mapped_column(String(80), nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
