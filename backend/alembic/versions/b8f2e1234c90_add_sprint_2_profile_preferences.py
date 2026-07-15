"""add sprint 2 profile preferences

Revision ID: b8f2e1234c90
Revises: 72c6315c31e9
Create Date: 2026-07-15 17:35:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "b8f2e1234c90"
down_revision = "72c6315c31e9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user_profiles", sa.Column("unit_system", sa.String(length=16), nullable=False, server_default="metric"))
    op.add_column("user_profiles", sa.Column("profile_configured", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("user_profiles", sa.Column("preferred_rest_day", sa.String(length=16), nullable=True))
    op.add_column("user_profiles", sa.Column("preferred_workout_time", sa.String(length=8), nullable=True))
    op.add_column("user_profiles", sa.Column("equipment_csv", sa.String(length=512), nullable=True))
    op.add_column("user_profiles", sa.Column("badminton_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("user_profiles", sa.Column("badminton_days_csv", sa.String(length=128), nullable=True))
    op.add_column("user_profiles", sa.Column("badminton_start_time", sa.String(length=8), nullable=True))
    op.add_column("user_profiles", sa.Column("badminton_end_time", sa.String(length=8), nullable=True))
    op.add_column("user_profiles", sa.Column("badminton_intensity", sa.String(length=16), nullable=True))
    op.add_column("user_profiles", sa.Column("show_exercise_illustrations", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("user_profiles", sa.Column("rest_timer_sound", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("user_profiles", sa.Column("default_rest_seconds", sa.Integer(), nullable=True))
    op.add_column("user_profiles", sa.Column("exercise_substitutions_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("user_profiles", sa.Column("planned_meals", sa.Integer(), nullable=True))
    op.add_column("user_profiles", sa.Column("kitchen_scale_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("user_profiles", sa.Column("measurement_unit", sa.String(length=16), nullable=False, server_default="metric"))
    op.add_column("user_profiles", sa.Column("meal_reminders_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("user_profiles", sa.Column("sleep_target_minutes", sa.Integer(), nullable=True))
    op.add_column("user_profiles", sa.Column("readiness_check_in_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("user_profiles", sa.Column("weekly_check_in_day", sa.String(length=16), nullable=True))
    op.add_column("user_profiles", sa.Column("smoking_tracking_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("user_profiles", sa.Column("cigarette_baseline", sa.Integer(), nullable=True))
    op.add_column("user_profiles", sa.Column("cigarette_reduction_target", sa.Integer(), nullable=True))
    op.add_column("user_profiles", sa.Column("first_cigarette_delay_minutes", sa.Integer(), nullable=True))


def downgrade() -> None:
    for column in (
        "first_cigarette_delay_minutes",
        "cigarette_reduction_target",
        "cigarette_baseline",
        "smoking_tracking_enabled",
        "weekly_check_in_day",
        "readiness_check_in_enabled",
        "sleep_target_minutes",
        "meal_reminders_enabled",
        "measurement_unit",
        "kitchen_scale_enabled",
        "planned_meals",
        "exercise_substitutions_enabled",
        "default_rest_seconds",
        "rest_timer_sound",
        "show_exercise_illustrations",
        "badminton_intensity",
        "badminton_end_time",
        "badminton_start_time",
        "badminton_days_csv",
        "badminton_enabled",
        "equipment_csv",
        "preferred_workout_time",
        "preferred_rest_day",
        "profile_configured",
        "unit_system",
    ):
        op.drop_column("user_profiles", column)
