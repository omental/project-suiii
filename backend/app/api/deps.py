from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.models.user_session import UserSession
from app.services.auth_service import AuthService


async def get_current_user_and_session(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> tuple[User, UserSession]:
    service = AuthService(db)
    user, session = await service.require_user(request)
    service.validate_csrf(request, session)
    return user, session


CurrentUserSession = Annotated[tuple[User, UserSession], Depends(get_current_user_and_session)]
