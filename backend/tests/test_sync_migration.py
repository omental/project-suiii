from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from typing import Any

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.models.meal_log import MealLog
from app.models.migration_batch import MigrationBatch
from app.models.sync_device import SyncDevice
from app.models.sync_mutation import SyncMutation
from app.schemas.sync import MigrationPreview, MigrationRequest, MutationRequest
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
        self.pending: list[Any] = []
        self.devices: dict[tuple[uuid.UUID, str], SyncDevice] = {}
        self.mutations: dict[tuple[uuid.UUID, str], SyncMutation] = {}
        self.meals: dict[tuple[uuid.UUID, str], MealLog] = {}
        self.batches: list[MigrationBatch] = []
        self.query_count = 0

    def begin(self) -> AsyncContext:
        return AsyncContext(self)

    def begin_nested(self) -> AsyncContext:
        return AsyncContext(self)

    async def rollback(self) -> None:
        self.rollback_called = True
        self.pending.clear()

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
            elif isinstance(record, MigrationBatch):
                self.batches.append(record)
        self.pending.clear()


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
async def test_migrate_exact_production_meal_payload_and_retry_is_idempotent() -> None:
    session = FakeSession()
    service = SyncService(session)  # type: ignore[arg-type]

    first = await service.migrate_local_data(USER_ID, migration([meal_mutation()]))
    retry = await service.migrate_local_data(USER_ID, migration([meal_mutation()]))

    meal = session.meals[(USER_ID, "2026-07-15:pre-badminton")]
    assert first.imported_records == 1
    assert retry.imported_records == 1
    assert len(session.meals) == 1
    assert meal.local_date == date(2026, 7, 15)
    assert meal.started_at == datetime(2026, 7, 15, 6, 8, 30, 92000, tzinfo=UTC)
    assert meal.completed_at == datetime(2026, 7, 15, 6, 8, 32, 205000, tzinfo=UTC)
    assert meal.payload["startedAt"] == "2026-07-15T06:08:30.092Z"


@pytest.mark.asyncio
async def test_invalid_record_is_rejected_and_later_query_still_runs() -> None:
    session = FakeSession()
    service = SyncService(session)  # type: ignore[arg-type]
    request = migration([meal_mutation({"date": "bad-date"}), meal_mutation(mutation_id="valid-second")])

    response = await service.migrate_local_data(USER_ID, request)

    assert response.status == "completed_with_errors"
    assert response.error_records == 1
    assert response.imported_records == 1
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
    assert raised.value.status_code == 500
    assert "INSERT" not in raised.value.detail
    assert "traceback" not in str(raised.value.detail).casefold()
