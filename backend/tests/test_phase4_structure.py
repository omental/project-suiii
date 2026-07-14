from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_postgresql_only_database_configuration() -> None:
    config = read("app/core/config.py")
    assert "postgresql+asyncpg://" in config
    assert "database named suii" in config
    assert "sqlite" not in config.casefold()


def test_initial_migration_contains_required_tables_and_constraints() -> None:
    migration = read("alembic/versions/20260714_0001_initial_phase4.py")
    for table in [
        "users",
        "user_sessions",
        "user_profiles",
        "daily_tracking",
        "meal_logs",
        "workout_sessions",
        "sync_mutations",
        "sync_devices",
        "migration_batches",
    ]:
        assert table in migration
    assert "uq_sync_mutations_user_client_mutation" in migration
    assert '("meal_logs", "meal_definition_id")' in migration
    assert '("workout_sessions", "workout_definition_id")' in migration
    assert 'name=f"uq_{table_name}_user_client_record"' in migration
    assert "postgresql.JSONB" in migration


def test_auth_uses_opaque_cookie_sessions_and_csrf_header() -> None:
    auth_service = read("app/services/auth_service.py")
    assert "set_cookie" in auth_service
    assert "httponly=True" in auth_service
    assert "token_hash" in auth_service
    assert "x-csrf-token" in auth_service
    assert "localStorage" not in auth_service


def test_no_public_registration_route() -> None:
    auth_router = read("app/api/v1/auth.py")
    assert '@router.post("/login"' in auth_router
    assert "register" not in auth_router.casefold()
