"""add sync changes

Revision ID: d4f7b2c8a901
Revises: b8f2e1234c90
Create Date: 2026-07-16 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "d4f7b2c8a901"
down_revision = "b8f2e1234c90"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sync_changes",
        sa.Column("sequence", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.String(length=180), nullable=False),
        sa.Column("operation", sa.String(length=24), nullable=False),
        sa.Column("server_updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("sequence"),
    )
    op.create_index("ix_sync_changes_user_id", "sync_changes", ["user_id"])
    op.create_index("ix_sync_changes_user_sequence", "sync_changes", ["user_id", "sequence"])
    op.create_index("ix_sync_changes_user_entity", "sync_changes", ["user_id", "entity_type", "entity_id"])


def downgrade() -> None:
    op.drop_index("ix_sync_changes_user_entity", table_name="sync_changes")
    op.drop_index("ix_sync_changes_user_sequence", table_name="sync_changes")
    op.drop_index("ix_sync_changes_user_id", table_name="sync_changes")
    op.drop_table("sync_changes")
