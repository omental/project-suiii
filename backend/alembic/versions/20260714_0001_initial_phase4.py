"""initial phase 4 schema

Revision ID: 20260714_0001
Revises:
Create Date: 2026-07-14 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260714_0001"
down_revision = None
branch_labels = None
depends_on = None


def timestamp(name: str) -> sa.Column:
    return sa.Column(name, sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"))


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("email_normalized", sa.String(length=320), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("timezone", sa.String(length=64), nullable=False, server_default="Asia/Dhaka"),
        timestamp("created_at"),
        timestamp("updated_at"),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("email_normalized", name="uq_users_email_normalized"),
    )
    op.create_table(
        "user_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False, unique=True),
        sa.Column("csrf_token_hash", sa.String(length=128), nullable=False),
        sa.Column("device_name", sa.String(length=120), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("remember_me", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"])
    op.create_index("ix_user_sessions_expires_at", "user_sessions", ["expires_at"])
    op.create_table(
        "user_profiles",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("height_cm", sa.Numeric(6, 2), nullable=False, server_default="180"),
        sa.Column("starting_weight_kg", sa.Numeric(6, 2), nullable=False, server_default="79"),
        sa.Column("target_weight_min_kg", sa.Numeric(6, 2), nullable=False, server_default="73"),
        sa.Column("target_weight_max_kg", sa.Numeric(6, 2), nullable=False, server_default="74"),
        sa.Column("starting_waist_in", sa.Numeric(6, 2), nullable=False, server_default="38.5"),
        sa.Column("target_waist_in", sa.Numeric(6, 2), nullable=False, server_default="35"),
        sa.Column("calorie_target", sa.Integer(), nullable=False, server_default="2200"),
        sa.Column("protein_target_g", sa.Integer(), nullable=False, server_default="145"),
        sa.Column("water_target_ml", sa.Integer(), nullable=False, server_default="3000"),
        sa.Column("timezone", sa.String(length=64), nullable=False, server_default="Asia/Dhaka"),
        sa.Column("programme_start_date", sa.Date(), nullable=True),
        timestamp("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_table(
        "daily_tracking",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tracking_date", sa.Date(), nullable=False),
        sa.Column("water_ml", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cigarettes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sleep_minutes", sa.Integer(), nullable=True),
        sa.Column("badminton_games", sa.Integer(), nullable=True),
        sa.Column("energy", sa.String(length=24), nullable=True),
        sa.Column("soreness", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        timestamp("created_at"),
        timestamp("updated_at"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("user_id", "tracking_date", name="uq_daily_tracking_user_date"),
    )
    for table_name, definition_id in (("meal_logs", "meal_definition_id"), ("workout_sessions", "workout_definition_id")):
        op.create_table(
            table_name,
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("client_record_id", sa.String(length=180), nullable=False),
            sa.Column("local_date", sa.Date(), nullable=False),
            sa.Column(definition_id, sa.String(length=120), nullable=False),
            sa.Column("status", sa.String(length=40), nullable=False),
            sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            timestamp("created_at"),
            timestamp("updated_at"),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint("user_id", "client_record_id", name=f"uq_{table_name}_user_client_record"),
        )
        op.create_index(f"ix_{table_name}_user_local_date", table_name, ["user_id", "local_date"])
        op.create_index(f"ix_{table_name}_user_updated_at", table_name, ["user_id", "updated_at"])
    op.create_table(
        "sync_mutations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_mutation_id", sa.String(length=180), nullable=False),
        sa.Column("device_id", sa.String(length=180), nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.String(length=180), nullable=False),
        sa.Column("mutation_type", sa.String(length=80), nullable=False),
        sa.Column("request_hash", sa.String(length=128), nullable=False),
        sa.Column("response_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "client_mutation_id", name="uq_sync_mutations_user_client_mutation"),
    )
    op.create_table(
        "sync_devices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("device_id", sa.String(length=180), nullable=False),
        sa.Column("device_name", sa.String(length=120), nullable=False),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("user_id", "device_id", name="uq_sync_devices_user_device"),
    )
    op.create_table(
        "migration_batches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("device_id", sa.String(length=180), nullable=False),
        sa.Column("conflict_policy", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("total_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("imported_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("skipped_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("conflict_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_records", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("summary", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        timestamp("created_at"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("migration_batches")
    op.drop_table("sync_devices")
    op.drop_table("sync_mutations")
    for table_name in ("workout_sessions", "meal_logs"):
        op.drop_index(f"ix_{table_name}_user_updated_at", table_name=table_name)
        op.drop_index(f"ix_{table_name}_user_local_date", table_name=table_name)
        op.drop_table(table_name)
    op.drop_table("daily_tracking")
    op.drop_table("user_profiles")
    op.drop_index("ix_user_sessions_expires_at", table_name="user_sessions")
    op.drop_index("ix_user_sessions_user_id", table_name="user_sessions")
    op.drop_table("user_sessions")
    op.drop_table("users")
