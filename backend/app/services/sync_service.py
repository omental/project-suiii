from __future__ import annotations

import hashlib
import json
import logging
from datetime import UTC, date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import utc_now
from app.models.body_measurement import BodyMeasurement
from app.models.daily_tracking import DailyTracking
from app.models.meal_log import MealLog
from app.models.migration_batch import MigrationBatch
from app.models.sync_device import SyncDevice
from app.models.sync_mutation import SyncMutation
from app.models.weekly_check_in import WeeklyCheckIn
from app.models.workout_session import WorkoutSession
from app.schemas.sync import MigrationRequest, MigrationResponse, MutationRequest, MutationResult, SyncPullRecord, SyncPullResponse

logger = logging.getLogger(__name__)


def request_hash(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _safe_iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _public_conflict_payload(record: Any, code: str) -> dict[str, Any]:
    return {
        "code": code,
        "server_version": getattr(record, "version", None),
        "server_updated_at": _safe_iso(getattr(record, "updated_at", None)),
    }


class SyncValidationError(ValueError):
    def __init__(self, code: str, message: str, field: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.field = field


def _empty_optional(value: Any) -> bool:
    return value is None or value == ""


def parse_local_date(value: Any, field: str = "local_date") -> date:
    if isinstance(value, datetime):
        raise SyncValidationError("invalid_local_date", f"{field} must be a calendar date.", field)
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError as exc:
            raise SyncValidationError("invalid_local_date", f"{field} must use YYYY-MM-DD.", field) from exc
    raise SyncValidationError("invalid_local_date", f"{field} must be a calendar date.", field)


def parse_utc_datetime(value: Any, field: str, *, optional: bool = True) -> datetime | None:
    if _empty_optional(value):
        if optional:
            return None
        raise SyncValidationError("invalid_timestamp", f"{field} is required.", field)
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as exc:
            raise SyncValidationError("invalid_timestamp", f"{field} must be a valid ISO timestamp.", field) from exc
    else:
        raise SyncValidationError("invalid_timestamp", f"{field} must be a valid ISO timestamp.", field)
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise SyncValidationError("invalid_timestamp", f"{field} must include timezone information.", field)
    return parsed.astimezone(UTC)


def parse_optional_uuid(value: Any, field: str) -> UUID | None:
    if _empty_optional(value):
        return None
    if isinstance(value, UUID):
        return value
    if isinstance(value, str):
        try:
            return UUID(value)
        except ValueError as exc:
            raise SyncValidationError("invalid_uuid", f"{field} must be a valid UUID.", field) from exc
    raise SyncValidationError("invalid_uuid", f"{field} must be a valid UUID.", field)


def parse_optional_decimal(value: Any, field: str) -> Decimal | None:
    if _empty_optional(value):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise SyncValidationError("invalid_decimal", f"{field} must be a valid number.", field) from exc


def payload_value(payload: dict[str, Any], snake_name: str, camel_name: str | None = None) -> Any:
    if snake_name in payload:
        return payload[snake_name]
    if camel_name and camel_name in payload:
        return payload[camel_name]
    return None


def require_payload_value(payload: dict[str, Any], snake_name: str, camel_name: str | None = None) -> Any:
    value = payload_value(payload, snake_name, camel_name)
    if _empty_optional(value):
        raise SyncValidationError("missing_required_field", f"{snake_name} is required.", snake_name)
    return value


def has_payload_value(payload: dict[str, Any], snake_name: str, camel_name: str | None = None) -> bool:
    return snake_name in payload or bool(camel_name and camel_name in payload)


def next_version(current: int | None, incoming: Any) -> int:
    return max((current or 0) + 1, int(incoming or 1))


class SyncService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def ensure_device(self, user_id: UUID, device_id: str, device_name: str) -> SyncDevice:
        device = await self.db.scalar(select(SyncDevice).where(SyncDevice.user_id == user_id, SyncDevice.device_id == device_id))
        if device is None:
            device = SyncDevice(user_id=user_id, device_id=device_id, device_name=device_name)
            self.db.add(device)
        device.last_seen_at = utc_now()
        return device

    async def apply_mutation(self, user_id: UUID, mutation: MutationRequest, *, preserve_existing: bool = False) -> MutationResult:
        digest = request_hash(mutation.model_dump(mode="json"))
        existing = await self.db.scalar(select(SyncMutation).where(SyncMutation.user_id == user_id, SyncMutation.client_mutation_id == mutation.client_mutation_id))
        if existing:
            if existing.request_hash != digest:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Mutation id reused with different payload")
            response_payload = dict(existing.response_payload)
            response_payload["status"] = "duplicate"
            return MutationResult(**response_payload)

        if mutation.entity_type == "daily_tracking":
            result = await self._apply_daily_tracking(user_id, mutation, preserve_existing=preserve_existing)
        elif mutation.entity_type == "meal_log":
            result = await self._apply_domain_record(user_id, mutation, MealLog, "meal_definition_id", preserve_existing=preserve_existing)
        elif mutation.entity_type == "workout_session":
            result = await self._apply_domain_record(user_id, mutation, WorkoutSession, "workout_definition_id", preserve_existing=preserve_existing)
        elif mutation.entity_type == "body_measurement":
            result = await self._apply_body_measurement(user_id, mutation, preserve_existing=preserve_existing)
        elif mutation.entity_type == "weekly_check_in":
            result = await self._apply_weekly_check_in(user_id, mutation, preserve_existing=preserve_existing)
        else:
            result = MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="applied", payload=mutation.payload)

        stored = SyncMutation(
            user_id=user_id,
            client_mutation_id=mutation.client_mutation_id,
            device_id=mutation.device_id,
            entity_type=mutation.entity_type,
            entity_id=mutation.entity_id,
            mutation_type=mutation.mutation_type,
            request_hash=digest,
            response_payload=result.model_dump(mode="json"),
        )
        self.db.add(stored)
        await self.db.flush()
        result.mutation_id = stored.id
        stored.response_payload = result.model_dump(mode="json")
        return result

    async def _apply_daily_tracking(self, user_id: UUID, mutation: MutationRequest, *, preserve_existing: bool = False) -> MutationResult:
        payload = mutation.payload
        tracking_date = parse_local_date(require_payload_value(payload, "tracking_date", "date"), "tracking_date")
        record = await self.db.scalar(select(DailyTracking).where(DailyTracking.user_id == user_id, DailyTracking.tracking_date == tracking_date))
        if preserve_existing and record is None and ("water_ml" not in payload or "cigarettes" not in payload):
            raise SyncValidationError("unknown_daily_totals", "Daily tracking migration requires explicit water_ml and cigarettes values to avoid recording unknown values as zero.", "daily_tracking")
        if preserve_existing and record:
            if payload.get("version", 1) == record.version:
                return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="already_exists", server_version=record.version, payload=_public_conflict_payload(record, "already_exists"))
            return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="server_newer", server_version=record.version, payload=_public_conflict_payload(record, "server_record_preserved"))
        if record and payload.get("version", 1) < record.version:
            return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="conflict", server_version=record.version, payload=_public_conflict_payload(record, "stale_version"))
        if record is None:
            record = DailyTracking(user_id=user_id, tracking_date=tracking_date)
            self.db.add(record)
        if mutation.mutation_type == "delete":
            record.deleted_at = utc_now()
        else:
            for field in ("water_ml", "cigarettes", "sleep_minutes", "badminton_games", "energy", "soreness", "notes"):
                if field in payload:
                    setattr(record, field, payload[field])
            record.version = next_version(record.version, payload.get("version", 1))
        await self.db.flush()
        return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="applied", server_version=record.version, payload={"id": str(record.id), "updated_at": record.updated_at.isoformat()})

    async def _apply_body_measurement(self, user_id: UUID, mutation: MutationRequest, *, preserve_existing: bool = False) -> MutationResult:
        payload = mutation.payload
        measured_at = parse_utc_datetime(require_payload_value(payload, "measured_at", "measuredAt"), "measured_at", optional=False)
        local_date = parse_local_date(require_payload_value(payload, "local_date", "date"), "local_date")
        client_record_id = require_payload_value(payload, "client_record_id", "id")
        record = await self.db.scalar(
            select(BodyMeasurement).where(
                BodyMeasurement.user_id == user_id,
                BodyMeasurement.client_record_id == client_record_id,
            )
        )
        incoming_version = int(payload.get("version", 1))
        incoming_payload = {
            "measured_at": measured_at.isoformat(),
            "local_date": local_date.isoformat(),
            "weight_kg": str(parse_optional_decimal(payload.get("weight_kg"), "weight_kg")) if parse_optional_decimal(payload.get("weight_kg"), "weight_kg") is not None else None,
            "waist_in": str(parse_optional_decimal(payload.get("waist_in"), "waist_in")) if parse_optional_decimal(payload.get("waist_in"), "waist_in") is not None else None,
            "chest_in": str(parse_optional_decimal(payload.get("chest_in"), "chest_in")) if parse_optional_decimal(payload.get("chest_in"), "chest_in") is not None else None,
            "arm_in": str(parse_optional_decimal(payload.get("arm_in"), "arm_in")) if parse_optional_decimal(payload.get("arm_in"), "arm_in") is not None else None,
            "thigh_in": str(parse_optional_decimal(payload.get("thigh_in"), "thigh_in")) if parse_optional_decimal(payload.get("thigh_in"), "thigh_in") is not None else None,
            "source": payload.get("source"),
            "note": payload.get("note"),
        }
        if record and preserve_existing:
            existing_payload = {
                "measured_at": record.measured_at.isoformat(),
                "local_date": record.local_date.isoformat(),
                "weight_kg": str(record.weight_kg) if record.weight_kg is not None else None,
                "waist_in": str(record.waist_in) if record.waist_in is not None else None,
                "chest_in": str(record.chest_in) if record.chest_in is not None else None,
                "arm_in": str(record.arm_in) if record.arm_in is not None else None,
                "thigh_in": str(record.thigh_in) if record.thigh_in is not None else None,
                "source": record.source,
                "note": record.note,
            }
            if request_hash(existing_payload) == request_hash(incoming_payload):
                return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="already_exists", server_version=record.version, payload=_public_conflict_payload(record, "already_exists"))
            status_code = "server_newer" if incoming_version <= record.version else "conflict"
            return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status=status_code, server_version=record.version, payload=_public_conflict_payload(record, "server_record_preserved"))
        if record and payload.get("version", 1) < record.version:
            return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="conflict", server_version=record.version, payload={"server_updated_at": record.updated_at.isoformat()})
        if record is None:
            record = BodyMeasurement(
                user_id=user_id,
                client_record_id=client_record_id,
                measured_at=measured_at,
                local_date=local_date,
            )
            self.db.add(record)
        if mutation.mutation_type == "delete":
            record.deleted_at = utc_now()
        else:
            typed_payload = {
                "measured_at": measured_at,
                "local_date": local_date,
                "weight_kg": parse_optional_decimal(payload.get("weight_kg"), "weight_kg"),
                "waist_in": parse_optional_decimal(payload.get("waist_in"), "waist_in"),
                "chest_in": parse_optional_decimal(payload.get("chest_in"), "chest_in"),
                "arm_in": parse_optional_decimal(payload.get("arm_in"), "arm_in"),
                "thigh_in": parse_optional_decimal(payload.get("thigh_in"), "thigh_in"),
            }
            for field, camel_field in (("measured_at", "measuredAt"), ("local_date", "date")):
                if has_payload_value(payload, field, camel_field):
                    setattr(record, field, typed_payload[field])
            for field in ("weight_kg", "waist_in", "chest_in", "arm_in", "thigh_in"):
                if has_payload_value(payload, field):
                    setattr(record, field, typed_payload[field])
            for field in ("source", "note"):
                if field in payload:
                    setattr(record, field, payload[field])
            record.version = next_version(record.version, payload.get("version", 1))
        await self.db.flush()
        return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="applied", server_version=record.version, payload={"id": str(record.id), "updated_at": record.updated_at.isoformat()})

    async def _apply_weekly_check_in(self, user_id: UUID, mutation: MutationRequest, *, preserve_existing: bool = False) -> MutationResult:
        payload = mutation.payload
        check_in_date = parse_local_date(require_payload_value(payload, "check_in_date", "date"), "check_in_date")
        completed_at = parse_utc_datetime(payload_value(payload, "completed_at", "completedAt"), "completed_at")
        measurement_id = parse_optional_uuid(payload_value(payload, "measurement_id", "measurementId"), "measurement_id")
        client_record_id = require_payload_value(payload, "client_record_id", "id")
        record = await self.db.scalar(
            select(WeeklyCheckIn).where(
                WeeklyCheckIn.user_id == user_id,
                WeeklyCheckIn.client_record_id == client_record_id,
            )
        )
        incoming_version = int(payload.get("version", 1))
        if record and preserve_existing:
            incoming_payload = {
                "week_number": payload.get("week_number"),
                "check_in_date": check_in_date.isoformat(),
                "status": payload.get("status"),
                "energy": payload.get("energy"),
                "hunger": payload.get("hunger"),
                "digestion": payload.get("digestion"),
                "average_sleep_minutes": payload.get("average_sleep_minutes"),
                "private_note": payload.get("private_note"),
                "measurement_id": str(measurement_id) if measurement_id else None,
                "completed_at": completed_at.isoformat() if completed_at else None,
            }
            existing_payload = {
                "week_number": record.week_number,
                "check_in_date": record.check_in_date.isoformat(),
                "status": record.status,
                "energy": record.energy,
                "hunger": record.hunger,
                "digestion": record.digestion,
                "average_sleep_minutes": record.average_sleep_minutes,
                "private_note": record.private_note,
                "measurement_id": str(record.measurement_id) if record.measurement_id else None,
                "completed_at": record.completed_at.isoformat() if record.completed_at else None,
            }
            if request_hash(existing_payload) == request_hash(incoming_payload):
                return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="already_exists", server_version=record.version, payload=_public_conflict_payload(record, "already_exists"))
            status_code = "server_newer" if incoming_version <= record.version else "conflict"
            return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status=status_code, server_version=record.version, payload=_public_conflict_payload(record, "server_record_preserved"))
        if record and payload.get("version", 1) < record.version:
            return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="conflict", server_version=record.version, payload={"server_updated_at": record.updated_at.isoformat()})
        if record is None:
            record = WeeklyCheckIn(
                user_id=user_id,
                client_record_id=client_record_id,
                week_number=payload["week_number"],
                check_in_date=check_in_date,
            )
            self.db.add(record)
        if mutation.mutation_type == "delete":
            record.deleted_at = utc_now()
        else:
            typed_payload = {
                "check_in_date": check_in_date,
                "completed_at": completed_at,
                "measurement_id": measurement_id,
            }
            for field in ("week_number", "status", "energy", "hunger", "digestion", "average_sleep_minutes", "private_note"):
                if field in payload:
                    setattr(record, field, payload[field])
            for field, camel_field in (("check_in_date", "date"), ("measurement_id", "measurementId"), ("completed_at", "completedAt")):
                if has_payload_value(payload, field, camel_field):
                    setattr(record, field, typed_payload[field])
            record.version = next_version(record.version, payload.get("version", 1))
        await self.db.flush()
        return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="applied", server_version=record.version, payload={"id": str(record.id), "updated_at": record.updated_at.isoformat()})

    async def pull_server_state(self, user_id: UUID) -> SyncPullResponse:
        records: list[SyncPullRecord] = []
        for row in (await self.db.scalars(select(MealLog).where(MealLog.user_id == user_id))).all():
            records.append(SyncPullRecord(entity_type="meal_log", entity_id=row.client_record_id, client_record_id=row.client_record_id, server_version=row.version, server_updated_at=row.updated_at, deleted_at=row.deleted_at, payload=row.payload))
        for row in (await self.db.scalars(select(WorkoutSession).where(WorkoutSession.user_id == user_id))).all():
            records.append(SyncPullRecord(entity_type="workout_session", entity_id=row.client_record_id, client_record_id=row.client_record_id, server_version=row.version, server_updated_at=row.updated_at, deleted_at=row.deleted_at, payload=row.payload))
        for row in (await self.db.scalars(select(DailyTracking).where(DailyTracking.user_id == user_id))).all():
            records.append(
                SyncPullRecord(
                    entity_type="daily_tracking",
                    entity_id=f"daily-{row.tracking_date.isoformat()}",
                    client_record_id=row.tracking_date.isoformat(),
                    server_version=row.version,
                    server_updated_at=row.updated_at,
                    deleted_at=row.deleted_at,
                    payload={
                        "tracking_date": row.tracking_date.isoformat(),
                        "water_ml": row.water_ml,
                        "cigarettes": row.cigarettes,
                        "sleep_minutes": row.sleep_minutes,
                        "badminton_games": row.badminton_games,
                        "energy": row.energy,
                        "soreness": row.soreness,
                        "notes": row.notes,
                        "version": row.version,
                    },
                )
            )
        for row in (await self.db.scalars(select(BodyMeasurement).where(BodyMeasurement.user_id == user_id))).all():
            records.append(
                SyncPullRecord(
                    entity_type="body_measurement",
                    entity_id=row.client_record_id,
                    client_record_id=row.client_record_id,
                    server_version=row.version,
                    server_updated_at=row.updated_at,
                    deleted_at=row.deleted_at,
                    payload={
                        "id": str(row.id),
                        "client_record_id": row.client_record_id,
                        "measured_at": row.measured_at.isoformat(),
                        "local_date": row.local_date.isoformat(),
                        "weight_kg": float(row.weight_kg) if row.weight_kg is not None else None,
                        "waist_in": float(row.waist_in) if row.waist_in is not None else None,
                        "chest_in": float(row.chest_in) if row.chest_in is not None else None,
                        "arm_in": float(row.arm_in) if row.arm_in is not None else None,
                        "thigh_in": float(row.thigh_in) if row.thigh_in is not None else None,
                        "source": row.source,
                        "note": row.note,
                        "version": row.version,
                        "deleted_at": row.deleted_at.isoformat() if row.deleted_at else None,
                    },
                )
            )
        for row in (await self.db.scalars(select(WeeklyCheckIn).where(WeeklyCheckIn.user_id == user_id))).all():
            records.append(
                SyncPullRecord(
                    entity_type="weekly_check_in",
                    entity_id=row.client_record_id,
                    client_record_id=row.client_record_id,
                    server_version=row.version,
                    server_updated_at=row.updated_at,
                    deleted_at=row.deleted_at,
                    payload={
                        "id": str(row.id),
                        "client_record_id": row.client_record_id,
                        "week_number": row.week_number,
                        "check_in_date": row.check_in_date.isoformat(),
                        "status": row.status,
                        "energy": row.energy,
                        "hunger": row.hunger,
                        "digestion": row.digestion,
                        "average_sleep_minutes": row.average_sleep_minutes,
                        "private_note": row.private_note,
                        "measurement_id": str(row.measurement_id) if row.measurement_id else None,
                        "completed_at": row.completed_at.isoformat() if row.completed_at else None,
                        "version": row.version,
                        "deleted_at": row.deleted_at.isoformat() if row.deleted_at else None,
                    },
                )
            )
        return SyncPullResponse(records=records, server_time=utc_now())

    async def _apply_domain_record(self, user_id: UUID, mutation: MutationRequest, model: type[MealLog] | type[WorkoutSession], definition_field: str, *, preserve_existing: bool = False) -> MutationResult:
        payload = mutation.payload
        local_date = parse_local_date(require_payload_value(payload, "local_date", "date"), "local_date")
        started_at = parse_utc_datetime(payload_value(payload, "started_at", "startedAt"), "started_at")
        completed_at = parse_utc_datetime(payload_value(payload, "completed_at", "completedAt"), "completed_at")
        definition_id = require_payload_value(payload, "definition_id", "mealDefinitionId" if model is MealLog else "workoutDefinitionId")
        client_record_id = require_payload_value(payload, "client_record_id", "id")
        record_payload = payload.get("payload") if isinstance(payload.get("payload"), dict) else payload
        record = await self.db.scalar(select(model).where(model.user_id == user_id, model.client_record_id == client_record_id))
        incoming_version = int(payload.get("version", 1))
        incoming_hash = request_hash(record_payload)
        if record:
            existing_hash = request_hash(record.payload)
            if existing_hash == incoming_hash:
                return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="already_exists", server_version=record.version, payload=_public_conflict_payload(record, "already_exists"))
            if preserve_existing:
                status_code = "server_newer" if incoming_version <= record.version else "conflict"
                return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status=status_code, server_version=record.version, payload=_public_conflict_payload(record, "server_record_preserved"))
        if record and payload.get("version", 1) < record.version:
            return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="conflict", server_version=record.version, payload=_public_conflict_payload(record, "stale_version"))
        if record is None:
            record = model(user_id=user_id, client_record_id=client_record_id, local_date=local_date, status=payload["status"], payload=record_payload)
            setattr(record, definition_field, definition_id)
            self.db.add(record)
        if mutation.mutation_type == "delete":
            record.deleted_at = utc_now()
        else:
            record.local_date = local_date
            setattr(record, definition_field, definition_id)
            record.status = payload["status"]
            record.payload = record_payload
            record.started_at = started_at
            record.completed_at = completed_at
            record.version = next_version(record.version, payload.get("version", 1))
        await self.db.flush()
        return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="applied", server_version=record.version, payload={"id": str(record.id), "updated_at": record.updated_at.isoformat()})

    async def migrate_local_data(self, user_id: UUID, request: MigrationRequest) -> MigrationResponse:
        imported = skipped = conflicts = errors = 0
        rejected: list[dict[str, Any]] = []
        outcomes: list[dict[str, Any]] = []
        try:
            device = await self.ensure_device(user_id, request.device_id, request.device_name)
            for mutation in request.records:
                try:
                    async with self.db.begin_nested():
                        result = await self.apply_mutation(user_id, mutation, preserve_existing=True)
                    if result.status == "applied":
                        imported += 1
                        outcomes.append({"record_type": mutation.entity_type, "client_record_id": payload_value(mutation.payload, "client_record_id", "id") or mutation.entity_id, "status": "migrated"})
                    elif result.status in {"duplicate", "already_exists"}:
                        skipped += 1
                        outcomes.append({"record_type": mutation.entity_type, "client_record_id": payload_value(mutation.payload, "client_record_id", "id") or mutation.entity_id, "status": "already_exists"})
                    elif result.status in {"conflict", "server_newer"}:
                        conflicts += 1
                        outcomes.append({"record_type": mutation.entity_type, "client_record_id": payload_value(mutation.payload, "client_record_id", "id") or mutation.entity_id, "status": result.status})
                        rejected.append(
                            {
                                "record_type": mutation.entity_type,
                                "client_record_id": payload_value(mutation.payload, "client_record_id", "id") or mutation.entity_id,
                                "status": result.status,
                                "code": str(result.payload.get("code", result.status)),
                                "message": "Server record was preserved.",
                            }
                        )
                except SyncValidationError as exc:
                    errors += 1
                    rejected.append(
                        {
                            "record_type": mutation.entity_type,
                            "client_record_id": payload_value(mutation.payload, "client_record_id", "id") or mutation.entity_id,
                            "status": "rejected",
                            "code": exc.code,
                            "message": exc.message,
                        }
                    )
                    outcomes.append({"record_type": mutation.entity_type, "client_record_id": payload_value(mutation.payload, "client_record_id", "id") or mutation.entity_id, "status": "rejected", "code": exc.code})
            summary = request.preview.model_dump(mode="json")
            summary["transaction_strategy"] = "request_transaction_with_per_record_savepoints"
            summary["outcome_items"] = outcomes
            if rejected:
                summary["rejected_items"] = rejected
            batch = MigrationBatch(
                user_id=user_id,
                device_id=request.device_id,
                conflict_policy=request.conflict_policy,
                status="completed" if errors == 0 else "completed_with_errors",
                total_records=request.preview.total_records,
                imported_records=imported,
                skipped_records=skipped,
                conflict_records=conflicts,
                error_records=errors,
                summary=summary,
                completed_at=utc_now(),
            )
            self.db.add(batch)
            device.last_sync_at = utc_now()
            await self.db.flush()
            await self.db.commit()
        except SQLAlchemyError as exc:
            await self.db.rollback()
            logger.exception("sync_migration_database_failure", extra={"user_id": str(user_id), "device_id": request.device_id})
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Migration failed. Please try again shortly.") from exc
        except Exception:
            await self.db.rollback()
            logger.exception("sync_migration_unexpected_failure", extra={"user_id": str(user_id), "device_id": request.device_id})
            raise
        return MigrationResponse(
            batch_id=batch.id,
            status=batch.status,
            imported_records=imported,
            skipped_records=skipped,
            conflict_records=conflicts,
            error_records=errors,
            summary=batch.summary,
        )
