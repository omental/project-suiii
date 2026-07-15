from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

EntityType = Literal["daily_tracking", "meal_log", "workout_session", "profile", "body_measurement", "weekly_check_in"]


class DailyTrackingUpsert(BaseModel):
    tracking_date: date
    water_ml: int | None = Field(default=None, ge=0, le=10000)
    cigarettes: int | None = Field(default=None, ge=0, le=100)
    sleep_minutes: int | None = Field(default=None, ge=0, le=1440)
    badminton_games: int | None = Field(default=None, ge=0, le=10)
    energy: str | None = None
    soreness: int | None = Field(default=None, ge=0, le=10)
    notes: str | None = Field(default=None, max_length=2000)
    version: int = Field(ge=1)


class DomainRecordUpsert(BaseModel):
    client_record_id: str = Field(min_length=1, max_length=180)
    local_date: date
    definition_id: str = Field(min_length=1, max_length=120)
    status: str = Field(min_length=1, max_length=40)
    payload: dict[str, Any]
    started_at: datetime | None = None
    completed_at: datetime | None = None
    version: int = Field(ge=1)


class MutationRequest(BaseModel):
    client_mutation_id: str = Field(min_length=1, max_length=180)
    device_id: str = Field(min_length=1, max_length=180)
    entity_type: EntityType
    entity_id: str = Field(min_length=1, max_length=180)
    mutation_type: Literal["upsert", "delete"]
    payload: dict[str, Any]


class MutationResult(BaseModel):
    mutation_id: UUID
    entity_type: EntityType
    entity_id: str
    status: Literal["applied", "duplicate", "already_exists", "server_newer", "conflict", "rejected"]
    server_version: int | None = None
    payload: dict[str, Any] = {}


class SyncPushRequest(BaseModel):
    mutations: list[MutationRequest] = Field(max_length=250)


class SyncPushResponse(BaseModel):
    results: list[MutationResult]
    server_time: datetime


class SyncPullRecord(BaseModel):
    entity_type: EntityType
    entity_id: str
    client_record_id: str
    server_version: int
    server_updated_at: datetime
    deleted_at: datetime | None = None
    payload: dict[str, Any]


class SyncPullResponse(BaseModel):
    records: list[SyncPullRecord]
    server_time: datetime


class MigrationPreview(BaseModel):
    meal_logs: int
    workout_sessions: int
    daily_check_ins: int
    sets: int
    date_range: str
    total_records: int


class MigrationRequest(BaseModel):
    device_id: str = Field(min_length=1, max_length=180)
    device_name: str = Field(min_length=1, max_length=120)
    conflict_policy: Literal["keep_latest", "keep_server", "review_each"]
    preview: MigrationPreview
    records: list[MutationRequest] = Field(max_length=1000)


class MigrationResponse(BaseModel):
    batch_id: UUID
    status: str
    imported_records: int
    skipped_records: int
    conflict_records: int
    error_records: int
    summary: dict[str, Any]


class SyncStatusResponse(BaseModel):
    online: bool = True
    pending_mutations: int = 0
    last_sync_at: datetime | None = None
    device_name: str | None = None
    recent_activity: list[str] = []


class SyncDeviceRead(BaseModel):
    id: UUID
    device_id: str
    device_id_display: str
    device_name: str
    first_seen_at: datetime
    last_seen_at: datetime
    last_sync_at: datetime | None = None
    revoked_at: datetime | None = None
    current: bool = False


class SyncDeviceUpdate(BaseModel):
    device_name: str = Field(min_length=1, max_length=120)
    device_id: str = Field(min_length=1, max_length=180)


class SyncDeviceRevoke(BaseModel):
    device_id: str = Field(min_length=1, max_length=180)
    confirm_current_device: bool = False
