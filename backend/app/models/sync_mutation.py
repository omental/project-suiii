from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SyncMutation(Base):
    __tablename__ = "sync_mutations"
    __table_args__ = (UniqueConstraint("user_id", "client_mutation_id", name="uq_sync_mutations_user_client_mutation"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    client_mutation_id: Mapped[str] = mapped_column(String(180), nullable=False)
    device_id: Mapped[str] = mapped_column(String(180), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(180), nullable=False)
    mutation_type: Mapped[str] = mapped_column(String(80), nullable=False)
    request_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    response_payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
