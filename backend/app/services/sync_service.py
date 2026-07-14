from __future__ import annotations

import hashlib
import json
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import utc_now
from app.models.daily_tracking import DailyTracking
from app.models.meal_log import MealLog
from app.models.migration_batch import MigrationBatch
from app.models.sync_device import SyncDevice
from app.models.sync_mutation import SyncMutation
from app.models.workout_session import WorkoutSession
from app.schemas.sync import MigrationRequest, MigrationResponse, MutationRequest, MutationResult


def request_hash(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


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

    async def apply_mutation(self, user_id: UUID, mutation: MutationRequest) -> MutationResult:
        digest = request_hash(mutation.model_dump(mode="json"))
        existing = await self.db.scalar(select(SyncMutation).where(SyncMutation.user_id == user_id, SyncMutation.client_mutation_id == mutation.client_mutation_id))
        if existing:
            if existing.request_hash != digest:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Mutation id reused with different payload")
            return MutationResult(**existing.response_payload, status="duplicate")

        if mutation.entity_type == "daily_tracking":
            result = await self._apply_daily_tracking(user_id, mutation)
        elif mutation.entity_type == "meal_log":
            result = await self._apply_domain_record(user_id, mutation, MealLog, "meal_definition_id")
        elif mutation.entity_type == "workout_session":
            result = await self._apply_domain_record(user_id, mutation, WorkoutSession, "workout_definition_id")
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

    async def _apply_daily_tracking(self, user_id: UUID, mutation: MutationRequest) -> MutationResult:
        payload = mutation.payload
        tracking_date = payload["tracking_date"]
        record = await self.db.scalar(select(DailyTracking).where(DailyTracking.user_id == user_id, DailyTracking.tracking_date == tracking_date))
        if record and payload.get("version", 1) < record.version:
            return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="conflict", server_version=record.version, payload={"server_updated_at": record.updated_at.isoformat()})
        if record is None:
            record = DailyTracking(user_id=user_id, tracking_date=tracking_date)
            self.db.add(record)
        if mutation.mutation_type == "delete":
            record.deleted_at = utc_now()
        else:
            for field in ("water_ml", "cigarettes", "sleep_minutes", "badminton_games", "energy", "soreness", "notes"):
                if field in payload:
                    setattr(record, field, payload[field])
            record.version = max(record.version + 1, payload.get("version", 1))
        await self.db.flush()
        return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="applied", server_version=record.version, payload={"id": str(record.id), "updated_at": record.updated_at.isoformat()})

    async def _apply_domain_record(self, user_id: UUID, mutation: MutationRequest, model: type[MealLog] | type[WorkoutSession], definition_field: str) -> MutationResult:
        payload = mutation.payload
        record = await self.db.scalar(select(model).where(model.user_id == user_id, model.client_record_id == payload["client_record_id"]))
        if record and payload.get("version", 1) < record.version:
            return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="conflict", server_version=record.version, payload={"server_updated_at": record.updated_at.isoformat()})
        if record is None:
            record = model(user_id=user_id, client_record_id=payload["client_record_id"], local_date=payload["local_date"], status=payload["status"], payload=payload["payload"])
            setattr(record, definition_field, payload["definition_id"])
            self.db.add(record)
        if mutation.mutation_type == "delete":
            record.deleted_at = utc_now()
        else:
            record.local_date = payload["local_date"]
            setattr(record, definition_field, payload["definition_id"])
            record.status = payload["status"]
            record.payload = payload["payload"]
            record.started_at = payload.get("started_at")
            record.completed_at = payload.get("completed_at")
            record.version = max(record.version + 1, payload.get("version", 1))
        await self.db.flush()
        return MutationResult(mutation_id=UUID(int=0), entity_type=mutation.entity_type, entity_id=mutation.entity_id, status="applied", server_version=record.version, payload={"id": str(record.id), "updated_at": record.updated_at.isoformat()})

    async def migrate_local_data(self, user_id: UUID, request: MigrationRequest) -> MigrationResponse:
        await self.ensure_device(user_id, request.device_id, request.device_name)
        imported = skipped = conflicts = errors = 0
        for mutation in request.records:
            try:
                result = await self.apply_mutation(user_id, mutation)
                if result.status in {"applied", "duplicate"}:
                    imported += 1
                elif result.status == "conflict":
                    conflicts += 1
            except Exception:
                errors += 1
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
            summary=request.preview.model_dump(mode="json"),
            completed_at=utc_now(),
        )
        self.db.add(batch)
        device = await self.ensure_device(user_id, request.device_id, request.device_name)
        device.last_sync_at = utc_now()
        await self.db.commit()
        return MigrationResponse(
            batch_id=batch.id,
            status=batch.status,
            imported_records=imported,
            skipped_records=skipped,
            conflict_records=conflicts,
            error_records=errors,
            summary=batch.summary,
        )
