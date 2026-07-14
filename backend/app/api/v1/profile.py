from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUserSession
from app.db.session import get_db
from app.models.user_profile import UserProfile
from app.schemas.profile import UserProfileRead
from app.services.auth_service import AuthService

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=UserProfileRead)
async def get_profile(current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> UserProfileRead:
    user, _ = current
    await AuthService(db).ensure_profile(user)
    await db.commit()
    profile = await db.get(UserProfile, user.id)
    return UserProfileRead.model_validate(profile)
