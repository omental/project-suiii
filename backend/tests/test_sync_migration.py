from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.body_measurement import BodyMeasurement
from app.models.daily_tracking import DailyTracking
from app.models.meal_log import MealLog
from app.models.migration_batch import MigrationBatch
from app.models.sync_device import SyncDevice
from app.models.sync_mutation import SyncMutation
from app.models.weekly_check_in import WeeklyCheckIn
from app.schemas.sync import MigrationPreview, MigrationRequest, MutationRequest, MutationResult
from app.services.sync_service import SyncService, SyncValidationError, parse_local_date, parse_utc_datetime


USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


class AsyncContext:
    def __init__(self, session: FakeSession) -> None:
        self.session = session

    async def __aenter__(self) -> None:
        return None

    async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> bool:
        return False


class FakeSession:
    def __init__(self, *, fail_flush: bool = False) -> None:
        self.fail_flush = fail_flush
        self.rollback_called = False
        self.rollback_count = 0
        self.commit_count = 0
        self.pending: list[Any] = []
        self.devices: dict[tuple[uuid.UUID, str], SyncDevice] = {}
        self.mutations: dict[tuple[uuid.UUID, str], SyncMutation] = {}
        self.meals: dict[tuple[uuid.UUID, str], MealLog] = {}
        self.daily: dict[tuple[uuid.UUID, date], DailyTracking] = {}
        self.measurements: dict[tuple[uuid.UUID, str], BodyMeasurement] = {}
        self.check_ins: dict[tuple[uuid.UUID, str], WeeklyCheckIn] = {}
        self.batches: list[MigrationBatch] = []
        self.query_count = 0

    def begin(self) -> AsyncContext:
        return AsyncContext(self)

    def begin_nested(self) -> AsyncContext:
        return AsyncContext(self)

    async def rollback(self) -> None:
        self.rollback_called = True
        self.rollback_count += 1
        self.pending.clear()

    async def commit(self) -> None:
        self.commit_count += 1

    def add(self, record: object) -> None:
        self.pending.append(record)

    async def scalar(self, statement: Any) -> object | None:
        self.query_count += 1
        entity = statement.column_descriptions[0]["entity"]
        params = statement.compile().params
        user_id = params.get("user_id_1")
        if entity is SyncDevice:
            return self.devices.get((user_id, params.get("device_id_1")))
        if entity is SyncMutation:
            return self.mutations.get((user_id, params.get("client_mutation_id_1")))
        if entity is MealLog:
            return self.meals.get((user_id, params.get("client_record_id_1")))
        if entity is DailyTracking:
            return self.daily.get((user_id, params.get("tracking_date_1")))
        if entity is BodyMeasurement:
            return self.measurements.get((user_id, params.get("client_record_id_1")))
        if entity is WeeklyCheckIn:
            return self.check_ins.get((user_id, params.get("client_record_id_1")))
        return None

    async def flush(self) -> None:
        if self.fail_flush:
            raise SQLAlchemyError("INSERT INTO meal_logs failed with params")
        now = datetime.now(UTC)
        for record in self.pending:
            if getattr(record, "id", None) is None:
                record.id = uuid.uuid4()
            if getattr(record, "version", None) is None:
                record.version = 1
            if getattr(record, "created_at", None) is None:
                record.created_at = now
            if getattr(record, "updated_at", None) is None:
                record.updated_at = now
            if isinstance(record, SyncDevice):
                self.devices[(record.user_id, record.device_id)] = record
            elif isinstance(record, SyncMutation):
                self.mutations[(record.user_id, record.client_mutation_id)] = record
            elif isinstance(record, MealLog):
                self.meals[(record.user_id, record.client_record_id)] = record
            elif isinstance(record, DailyTracking):
                self.daily[(record.user_id, record.tracking_date)] = record
            elif isinstance(record, BodyMeasurement):
                self.measurements[(record.user_id, record.client_record_id)] = record
            elif isinstance(record, WeeklyCheckIn):
                self.check_ins[(record.user_id, record.client_record_id)] = record
            elif isinstance(record, MigrationBatch):
                self.batches.append(record)
        self.pending.clear()


class AutobeginAsyncSession(AsyncSession):
    """Real AsyncSession transaction state without requiring an external test database."""

    def __init__(self) -> None:
        super().__init__()
        self.commit_count = 0
        self.rollback_count = 0
        self.added: list[object] = []

    async def execute(self, statement: Any, *args: Any, **kwargs: Any) -> object:
        if not self.in_transaction():
            self.sync_session.begin()
        return SimpleNamespace(statement=statement, args=args, kwargs=kwargs)

    def add(self, instance: object, _warn: bool = True) -> None:
        self.added.append(instance)

    async def flush(self, objects: Any = None) -> None:
        now = datetime.now(UTC)
        for record in self.added:
            if getattr(record, "id", None) is None:
                record.id = uuid.uuid4()
            if getattr(record, "created_at", None) is None:
                record.created_at = now
            if getattr(record, "updated_at", None) is None:
                record.updated_at = now
        return None

    async def commit(self) -> None:
        self.commit_count += 1
        await super().commit()

    async def rollback(self) -> None:
        self.rollback_count += 1
        await super().rollback()


class LifecycleSyncService(SyncService):
    def __init__(self, db: AutobeginAsyncSession) -> None:
        super().__init__(db)
        self.seen_mutations: set[str] = set()
        self.applied_count = 0

    async def ensure_device(self, user_id: uuid.UUID, device_id: str, device_name: str) -> Any:
        return SimpleNamespace(last_sync_at=None)

    async def apply_mutation(self, user_id: uuid.UUID, mutation: MutationRequest, *, preserve_existing: bool = False) -> MutationResult:
        status = "duplicate" if mutation.client_mutation_id in self.seen_mutations else "applied"
        self.seen_mutations.add(mutation.client_mutation_id)
        if status == "applied":
            self.applied_count += 1
        return MutationResult(
            mutation_id=uuid.UUID(int=0),
            entity_type=mutation.entity_type,
            entity_id=mutation.entity_id,
            status=status,
            server_version=1,
            payload={"id": mutation.entity_id, "updated_at": datetime.now(UTC).isoformat()},
        )


def preview(total: int = 1) -> MigrationPreview:
    return MigrationPreview(meal_logs=total, workout_sessions=0, daily_check_ins=0, sets=0, date_range="2026-07-15", total_records=total)


def meal_mutation(payload: dict[str, Any] | None = None, mutation_id: str = "migrate-meal-2026-07-15:pre-badminton") -> MutationRequest:
    body = {
        "client_record_id": "2026-07-15:pre-badminton",
        "date": "2026-07-15",
        "mealDefinitionId": "pre-badminton",
        "status": "completed",
        "startedAt": "2026-07-15T06:08:30.092Z",
        "completedAt": "2026-07-15T06:08:32.205Z",
        "updatedAt": "2026-07-15T06:08:32.205Z",
        "version": 1,
    }
    body.update(payload or {})
    return MutationRequest(
        client_mutation_id=mutation_id,
        device_id="device-local",
        entity_type="meal_log",
        entity_id="2026-07-15:pre-badminton",
        mutation_type="upsert",
        payload=body,
    )


def daily_mutation(payload: dict[str, Any] | None = None, mutation_id: str = "migrate-daily-2026-07-15") -> MutationRequest:
    body = {
        "tracking_date": "2026-07-15",
        "badminton_games": 1,
        "energy": "normal",
        "soreness": 2,
        "sleep_minutes": 420,
        "notes": "readiness",
        "version": 1,
    }
    body.update(payload or {})
    return MutationRequest(client_mutation_id=mutation_id, device_id="device-local", entity_type="daily_tracking", entity_id="daily-2026-07-15", mutation_type="upsert", payload=body)


def measurement_mutation(payload: dict[str, Any] | None = None, mutation_id: str = "migrate-measurement-1") -> MutationRequest:
    body = {
        "client_record_id": "measurement-client-1",
        "measured_at": "2026-07-15T00:00:00.000Z",
        "local_date": "2026-07-15",
        "weight_kg": 78,
        "waist_in": 37,
        "source": "manual",
        "note": "local",
        "version": 1,
    }
    body.update(payload or {})
    return MutationRequest(client_mutation_id=mutation_id, device_id="device-local", entity_type="body_measurement", entity_id="measurement-1", mutation_type="upsert", payload=body)


def check_in_mutation(payload: dict[str, Any] | None = None, mutation_id: str = "migrate-check-in-1") -> MutationRequest:
    body = {
        "client_record_id": "check-in-client-1",
        "week_number": 1,
        "check_in_date": "2026-07-15",
        "status": "completed",
        "energy": "normal",
        "hunger": "normal",
        "digestion": "good",
        "average_sleep_minutes": 420,
        "private_note": "local",
        "completed_at": "2026-07-15T00:00:00.000Z",
        "version": 1,
    }
    body.update(payload or {})
    return MutationRequest(client_mutation_id=mutation_id, device_id="device-local", entity_type="weekly_check_in", entity_id="check-in-1", mutation_type="upsert", payload=body)


def migration(records: list[MutationRequest]) -> MigrationRequest:
    return MigrationRequest(
        device_id="device-local",
        device_name="This device",
        conflict_policy="keep_latest",
        preview=preview(len(records)),
        records=records,
    )


def test_parse_helpers_reject_bad_and_naive_values() -> None:
    assert parse_local_date("2026-07-15") == date(2026, 7, 15)
    assert parse_utc_datetime("2026-07-15T06:08:30.092Z", "started_at").tzinfo is UTC
    assert parse_utc_datetime(None, "completed_at") is None
    with pytest.raises(SyncValidationError, match="YYYY-MM-DD"):
        parse_local_date("15-07-2026")
    with pytest.raises(SyncValidationError, match="valid ISO timestamp"):
        parse_utc_datetime("not-a-time", "started_at")
    with pytest.raises(SyncValidationError, match="timezone"):
        parse_utc_datetime("2026-07-15T06:08:30.092", "started_at")


@pytest.mark.asyncio
async def test_real_async_session_autobegun_transaction_migrates_and_retries() -> None:
    session = AutobeginAsyncSession()
    service = LifecycleSyncService(session)

    await session.execute(text("SELECT 1"))
    assert session.in_transaction() is True

    first = await service.migrate_local_data(USER_ID, migration([meal_mutation()]))
    assert first.imported_records == 1
    assert session.commit_count == 1
    assert session.rollback_count == 0
    assert session.in_transaction() is False

    await session.execute(text("SELECT 1"))
    assert session.in_transaction() is True
    retry = await service.migrate_local_data(USER_ID, migration([meal_mutation()]))

    assert retry.skipped_records == 1
    assert service.applied_count == 1
    assert session.commit_count == 2
    assert session.rollback_count == 0
    await session.execute(text("SELECT 1"))
    assert session.in_transaction() is True
    await session.rollback()


@pytest.mark.asyncio
async def test_migrate_exact_production_meal_payload_and_retry_is_idempotent() -> None:
    session = FakeSession()
    service = SyncService(session)  # type: ignore[arg-type]

    first = await service.migrate_local_data(USER_ID, migration([meal_mutation()]))
    retry = await service.migrate_local_data(USER_ID, migration([meal_mutation()]))

    meal = session.meals[(USER_ID, "2026-07-15:pre-badminton")]
    assert first.imported_records == 1
    assert retry.skipped_records == 1
    assert session.commit_count == 2
    assert len(session.meals) == 1
    assert meal.local_date == date(2026, 7, 15)
    assert meal.started_at == datetime(2026, 7, 15, 6, 8, 30, 92000, tzinfo=UTC)
    assert meal.completed_at == datetime(2026, 7, 15, 6, 8, 32, 205000, tzinfo=UTC)
    assert meal.payload["startedAt"] == "2026-07-15T06:08:30.092Z"


@pytest.mark.asyncio
async def test_stale_local_meal_cannot_overwrite_newer_server_meal() -> None:
    session = FakeSession()
    server_meal = MealLog(
        user_id=USER_ID,
        client_record_id="2026-07-15:pre-badminton",
        local_date=date(2026, 7, 15),
        meal_definition_id="pre-badminton",
        status="completed",
        payload={"id": "2026-07-15:pre-badminton", "status": "completed", "server": "newer"},
        started_at=datetime(2026, 7, 15, 6, 8, 30, 92000, tzinfo=UTC),
        completed_at=datetime(2026, 7, 15, 6, 20, 0, tzinfo=UTC),
        version=3,
    )
    server_meal.updated_at = datetime(2026, 7, 15, 7, 0, 0, tzinfo=UTC)
    session.meals[(USER_ID, "2026-07-15:pre-badminton")] = server_meal
    service = SyncService(session)  # type: ignore[arg-type]

    response = await service.migrate_local_data(USER_ID, migration([meal_mutation({"version": 1, "status": "skipped"})]))

    meal = session.meals[(USER_ID, "2026-07-15:pre-badminton")]
    assert response.conflict_records == 1
    assert response.summary["rejected_items"][0]["status"] == "server_newer"
    assert meal.version == 3
    assert meal.status == "completed"
    assert meal.payload == {"id": "2026-07-15:pre-badminton", "status": "completed", "server": "newer"}


@pytest.mark.asyncio
async def test_identical_migration_returns_already_exists_without_overwrite() -> None:
    session = FakeSession()
    service = SyncService(session)  # type: ignore[arg-type]

    first = await service.migrate_local_data(USER_ID, migration([meal_mutation()]))
    second = await service.migrate_local_data(USER_ID, migration([meal_mutation(mutation_id="migrate-meal-retry-2")]))

    assert first.imported_records == 1
    assert second.skipped_records == 1
    assert second.imported_records == 0


@pytest.mark.asyncio
async def test_newer_local_migration_conflicts_instead_of_overwriting_server() -> None:
    session = FakeSession()
    server_meal = MealLog(
        user_id=USER_ID,
        client_record_id="2026-07-15:pre-badminton",
        local_date=date(2026, 7, 15),
        meal_definition_id="pre-badminton",
        status="completed",
        payload={"server": "preserved"},
        version=1,
    )
    server_meal.updated_at = datetime(2026, 7, 15, 7, 0, 0, tzinfo=UTC)
    session.meals[(USER_ID, "2026-07-15:pre-badminton")] = server_meal
    service = SyncService(session)  # type: ignore[arg-type]

    response = await service.migrate_local_data(USER_ID, migration([meal_mutation({"version": 4, "status": "skipped"})]))

    assert response.conflict_records == 1
    assert response.summary["rejected_items"][0]["status"] == "conflict"
    assert session.meals[(USER_ID, "2026-07-15:pre-badminton")].payload == {"server": "preserved"}


@pytest.mark.asyncio
async def test_stale_daily_tracking_migration_preserves_server_values() -> None:
    session = FakeSession()
    server = DailyTracking(
        user_id=USER_ID,
        tracking_date=date(2026, 7, 15),
        water_ml=3200,
        cigarettes=2,
        sleep_minutes=480,
        badminton_games=2,
        energy="high",
        soreness=1,
        notes="server",
        version=4,
    )
    server.updated_at = datetime(2026, 7, 15, 8, 0, 0, tzinfo=UTC)
    session.daily[(USER_ID, date(2026, 7, 15))] = server
    service = SyncService(session)  # type: ignore[arg-type]

    response = await service.migrate_local_data(USER_ID, migration([daily_mutation({"version": 1, "energy": "low"})]))

    assert response.conflict_records == 1
    assert response.summary["rejected_items"][0]["status"] == "server_newer"
    assert session.daily[(USER_ID, date(2026, 7, 15))].energy == "high"
    assert session.daily[(USER_ID, date(2026, 7, 15))].water_ml == 3200


@pytest.mark.asyncio
async def test_daily_tracking_migration_rejects_unknown_water_and_cigarettes_instead_of_zeroing() -> None:
    session = FakeSession()
    service = SyncService(session)  # type: ignore[arg-type]

    response = await service.migrate_local_data(USER_ID, migration([daily_mutation()]))

    assert response.error_records == 1
    assert response.summary["rejected_items"][0]["code"] == "unknown_daily_totals"
    assert session.daily == {}


@pytest.mark.asyncio
async def test_stale_measurement_migration_preserves_server_values() -> None:
    session = FakeSession()
    server = BodyMeasurement(
        user_id=USER_ID,
        client_record_id="measurement-client-1",
        measured_at=datetime(2026, 7, 15, 0, 0, tzinfo=UTC),
        local_date=date(2026, 7, 15),
        weight_kg=Decimal("77.00"),
        waist_in=Decimal("36.50"),
        source="manual",
        note="server",
        version=3,
    )
    server.updated_at = datetime(2026, 7, 15, 8, 0, 0, tzinfo=UTC)
    session.measurements[(USER_ID, "measurement-client-1")] = server
    service = SyncService(session)  # type: ignore[arg-type]

    response = await service.migrate_local_data(USER_ID, migration([measurement_mutation({"version": 1, "weight_kg": 80})]))

    assert response.conflict_records == 1
    assert response.summary["rejected_items"][0]["status"] == "server_newer"
    assert session.measurements[(USER_ID, "measurement-client-1")].weight_kg == Decimal("77.00")


@pytest.mark.asyncio
async def test_stale_check_in_migration_preserves_server_values() -> None:
    session = FakeSession()
    server = WeeklyCheckIn(
        user_id=USER_ID,
        client_record_id="check-in-client-1",
        week_number=1,
        check_in_date=date(2026, 7, 15),
        status="completed",
        energy="high",
        hunger="normal",
        digestion="good",
        average_sleep_minutes=500,
        private_note="server",
        completed_at=datetime(2026, 7, 15, 1, 0, tzinfo=UTC),
        version=5,
    )
    server.updated_at = datetime(2026, 7, 15, 8, 0, 0, tzinfo=UTC)
    session.check_ins[(USER_ID, "check-in-client-1")] = server
    service = SyncService(session)  # type: ignore[arg-type]

    response = await service.migrate_local_data(USER_ID, migration([check_in_mutation({"version": 1, "energy": "low"})]))

    assert response.conflict_records == 1
    assert response.summary["rejected_items"][0]["status"] == "server_newer"
    assert session.check_ins[(USER_ID, "check-in-client-1")].energy == "high"


@pytest.mark.asyncio
async def test_invalid_record_is_rejected_and_later_query_still_runs() -> None:
    session = FakeSession()
    service = SyncService(session)  # type: ignore[arg-type]
    request = migration([meal_mutation({"date": "bad-date"}), meal_mutation(mutation_id="valid-second")])

    response = await service.migrate_local_data(USER_ID, request)

    assert response.status == "completed_with_errors"
    assert response.error_records == 1
    assert response.imported_records == 1
    assert session.commit_count == 1
    assert session.rollback_count == 0
    assert session.query_count > 1
    assert response.summary["rejected_items"][0]["code"] == "invalid_local_date"


@pytest.mark.asyncio
async def test_optional_null_timestamp_is_accepted() -> None:
    session = FakeSession()
    service = SyncService(session)  # type: ignore[arg-type]

    await service.migrate_local_data(USER_ID, migration([meal_mutation({"completedAt": None})]))

    meal = session.meals[(USER_ID, "2026-07-15:pre-badminton")]
    assert meal.completed_at is None


@pytest.mark.asyncio
async def test_malformed_and_timezone_naive_timestamps_are_rejected() -> None:
    for bad_value in ("not-a-time", "2026-07-15T06:08:30.092"):
        session = FakeSession()
        service = SyncService(session)  # type: ignore[arg-type]

        response = await service.migrate_local_data(USER_ID, migration([meal_mutation({"startedAt": bad_value})]))

        assert response.status == "completed_with_errors"
        assert response.error_records == 1
        assert response.summary["rejected_items"][0]["code"] == "invalid_timestamp"
        assert session.meals == {}


@pytest.mark.asyncio
async def test_database_flush_failure_rolls_back_and_returns_safe_error() -> None:
    session = FakeSession(fail_flush=True)
    service = SyncService(session)  # type: ignore[arg-type]

    with pytest.raises(HTTPException) as raised:
        await service.migrate_local_data(USER_ID, migration([meal_mutation()]))

    assert session.rollback_called is True
    assert session.rollback_count == 1
    assert session.commit_count == 0
    assert raised.value.status_code == 500
    assert "INSERT" not in raised.value.detail
    assert "traceback" not in str(raised.value.detail).casefold()
