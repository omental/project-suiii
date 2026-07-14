from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUserSession
from app.db.session import get_db
from app.models.user_session import UserSession
from app.schemas.auth import LoginRequest, LoginResponse, SessionRead, UserRead
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def user_read(user) -> UserRead:
    return UserRead(id=user.id, email=user.email, full_name=user.full_name, timezone=user.timezone, is_active=user.is_active, is_admin=user.is_admin)


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, request: Request, response: Response, db: Annotated[AsyncSession, Depends(get_db)]) -> LoginResponse:
    service = AuthService(db)
    user = await service.authenticate(str(payload.email), payload.password)
    session, csrf_token = await service.create_session(user, request, response, payload.remember_me, payload.device_name)
    return LoginResponse(user=user_read(user), csrf_token=csrf_token, expires_at=session.expires_at)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> None:
    _, session = current
    service = AuthService(db)
    await service.revoke_session(session.id, session.user_id)
    service.clear_auth_cookies(response)


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
async def logout_all(response: Response, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> None:
    user, _ = current
    service = AuthService(db)
    await service.revoke_all(user.id)
    service.clear_auth_cookies(response)


@router.get("/me", response_model=UserRead)
async def me(current: CurrentUserSession) -> UserRead:
    user, _ = current
    return user_read(user)


@router.get("/sessions", response_model=list[SessionRead])
async def sessions(current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> list[SessionRead]:
    user, active = current
    rows = (await db.scalars(select(UserSession).where(UserSession.user_id == user.id).order_by(UserSession.created_at.desc()))).all()
    return [
        SessionRead(id=row.id, device_name=row.device_name, created_at=row.created_at, last_seen_at=row.last_seen_at, expires_at=row.expires_at, revoked_at=row.revoked_at, remember_me=row.remember_me, current=row.id == active.id)
        for row in rows
    ]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: UUID, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> None:
    user, _ = current
    await AuthService(db).revoke_session(session_id, user.id)
