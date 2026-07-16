from __future__ import annotations

from typing import Annotated
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUserSession
from app.core.security import utc_now
from app.db.session import get_db
from app.models.sync_device import SyncDevice
from app.schemas.sync import MigrationRequest, MigrationResponse, SyncDeviceRead, SyncDeviceRevoke, SyncDeviceUpdate, SyncPullResponse, SyncPushRequest, SyncPushResponse, SyncStatusResponse
from app.services.sync_service import SyncService, SyncValidationError
from app.core.config import get_settings

router = APIRouter(prefix="/sync", tags=["sync"])
logger = logging.getLogger(__name__)


def _device_display(device_id: str) -> str:
    return device_id if len(device_id) <= 10 else f"{device_id[:6]}…{device_id[-4:]}"


def _device_read(row: SyncDevice, current_device_id: str | None = None) -> SyncDeviceRead:
    return SyncDeviceRead(
        id=row.id,
        device_id=row.device_id,
        device_id_display=_device_display(row.device_id),
        device_name=row.device_name,
        first_seen_at=row.first_seen_at,
        last_seen_at=row.last_seen_at,
        last_sync_at=row.last_sync_at,
        revoked_at=row.revoked_at,
        current=current_device_id == row.device_id,
    )


@router.get("/status", response_model=SyncStatusResponse)
async def status() -> SyncStatusResponse:
    return SyncStatusResponse(online=True, recent_activity=["Backend ready"])


@router.get("/devices", response_model=list[SyncDeviceRead])
async def devices(current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)], device_id: str | None = None) -> list[SyncDeviceRead]:
    user, _ = current
    rows = (await db.scalars(select(SyncDevice).where(SyncDevice.user_id == user.id).order_by(SyncDevice.last_seen_at.desc()))).all()
    return [_device_read(row, device_id) for row in rows]


@router.patch("/devices", response_model=SyncDeviceRead)
async def rename_device(payload: SyncDeviceUpdate, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> SyncDeviceRead:
    user, _ = current
    row = await db.scalar(select(SyncDevice).where(SyncDevice.user_id == user.id, SyncDevice.device_id == payload.device_id))
    if row is None:
        raise HTTPException(status_code=404, detail="Device not found")
    if row.revoked_at is not None:
        raise HTTPException(status_code=409, detail="Revoked devices cannot be renamed")
    row.device_name = payload.device_name
    await db.commit()
    await db.refresh(row)
    return _device_read(row, payload.device_id)


@router.post("/devices/revoke", response_model=SyncDeviceRead)
async def revoke_device(payload: SyncDeviceRevoke, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> SyncDeviceRead:
    user, _ = current
    row = await db.scalar(select(SyncDevice).where(SyncDevice.user_id == user.id, SyncDevice.device_id == payload.device_id))
    if row is None:
        raise HTTPException(status_code=404, detail="Device not found")
    if row.revoked_at is None:
        row.revoked_at = utc_now()
    await db.commit()
    await db.refresh(row)
    return _device_read(row, payload.device_id)


@router.post("/push", response_model=SyncPushResponse)
async def push(payload: SyncPushRequest, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> SyncPushResponse:
    user, _ = current
    user_id = user.id
    service = SyncService(db)
    results = []
    try:
        for mutation in payload.mutations:
            await service.ensure_device(user_id, mutation.device_id, mutation.device_id)
            results.append(await service.apply_mutation(user_id, mutation))
        await db.commit()
    except SyncValidationError as exc:
        await db.rollback()
        raise HTTPException(status_code=422, detail={"code": exc.code, "message": exc.message}) from exc
    except SQLAlchemyError as exc:
        await db.rollback()
        logger.exception("Sync push failed for user_id=%s", user_id)
        raise HTTPException(status_code=500, detail="Sync failed. Please try again shortly.") from exc
    return SyncPushResponse(results=results, server_time=utc_now())


@router.get("/pull", response_model=SyncPullResponse)
async def pull(current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)], cursor: str | None = None, limit: int = 250) -> SyncPullResponse:
    user, _ = current
    if get_settings().environment == "test":
        from app.api.v1.test_control import consume_fail_next_sync_pull

        if consume_fail_next_sync_pull():
            raise HTTPException(status_code=500, detail="Controlled test sync pull failure")
    try:
        return await SyncService(db).pull_server_state(user.id, cursor=cursor, limit=limit)
    except SyncValidationError as exc:
        raise HTTPException(status_code=400, detail={"code": exc.code, "message": exc.message}) from exc


@router.post("/migrate", response_model=MigrationResponse)
async def migrate(payload: MigrationRequest, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> MigrationResponse:
    user, _ = current
    return await SyncService(db).migrate_local_data(user.id, payload)
