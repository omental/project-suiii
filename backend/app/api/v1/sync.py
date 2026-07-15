from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUserSession
from app.core.security import utc_now
from app.db.session import get_db
from app.schemas.sync import MigrationRequest, MigrationResponse, SyncPullResponse, SyncPushRequest, SyncPushResponse, SyncStatusResponse
from app.services.sync_service import SyncService, SyncValidationError

router = APIRouter(prefix="/sync", tags=["sync"])


@router.get("/status", response_model=SyncStatusResponse)
async def status() -> SyncStatusResponse:
    return SyncStatusResponse(online=True, recent_activity=["Backend ready"])


@router.post("/push", response_model=SyncPushResponse)
async def push(payload: SyncPushRequest, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> SyncPushResponse:
    user, _ = current
    service = SyncService(db)
    results = []
    try:
        for mutation in payload.mutations:
            await service.ensure_device(user.id, mutation.device_id, mutation.device_id)
            results.append(await service.apply_mutation(user.id, mutation))
        await db.commit()
    except SyncValidationError as exc:
        await db.rollback()
        raise HTTPException(status_code=422, detail={"code": exc.code, "message": exc.message}) from exc
    except SQLAlchemyError as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Sync failed. Please try again shortly.") from exc
    return SyncPushResponse(results=results, server_time=utc_now())


@router.get("/pull", response_model=SyncPullResponse)
async def pull(current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> SyncPullResponse:
    user, _ = current
    return await SyncService(db).pull_server_state(user.id)


@router.post("/migrate", response_model=MigrationResponse)
async def migrate(payload: MigrationRequest, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> MigrationResponse:
    user, _ = current
    return await SyncService(db).migrate_local_data(user.id, payload)
