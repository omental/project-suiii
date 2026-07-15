from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUserSession
from app.db.session import get_db
from app.models.user_profile import UserProfile
from app.schemas.profile import UserProfileRead, UserProfileUpdate
from app.services.auth_service import AuthService

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=UserProfileRead)
async def get_profile(current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> UserProfileRead:
    user, _ = current
    await AuthService(db).ensure_profile(user)
    await db.commit()
    profile = await db.get(UserProfile, user.id)
    return UserProfileRead.model_validate(profile)


@router.patch("", response_model=UserProfileRead)
async def update_profile(payload: UserProfileUpdate, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> UserProfileRead:
    user, _ = current
    await AuthService(db).ensure_profile(user)
    profile = await db.get(UserProfile, user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    if payload.expected_version is not None and payload.expected_version != profile.version:
        raise HTTPException(status_code=409, detail="Profile was updated elsewhere. Refresh and review before saving.")
    if payload.full_name is not None:
        user.full_name = payload.full_name
    for field in (
        "height_cm",
        "starting_weight_kg",
        "target_weight_min_kg",
        "target_weight_max_kg",
        "starting_waist_in",
        "target_waist_in",
        "calorie_target",
        "protein_target_g",
        "water_target_ml",
        "timezone",
        "unit_system",
        "programme_start_date",
        "preferred_rest_day",
        "preferred_workout_time",
        "badminton_enabled",
        "badminton_start_time",
        "badminton_end_time",
        "badminton_intensity",
        "show_exercise_illustrations",
        "rest_timer_sound",
        "default_rest_seconds",
        "exercise_substitutions_enabled",
        "planned_meals",
        "kitchen_scale_enabled",
        "measurement_unit",
        "meal_reminders_enabled",
        "sleep_target_minutes",
        "readiness_check_in_enabled",
        "weekly_check_in_day",
        "smoking_tracking_enabled",
        "cigarette_baseline",
        "cigarette_reduction_target",
        "first_cigarette_delay_minutes",
    ):
        value = getattr(payload, field)
        if value is not None:
            setattr(profile, field, value)
    if payload.equipment is not None:
        profile.equipment_csv = ",".join(payload.equipment)
    if payload.badminton_days is not None:
        profile.badminton_days_csv = ",".join(payload.badminton_days)
    profile.profile_configured = True
    profile.version += 1
    await db.commit()
    await db.refresh(profile)
    return UserProfileRead.model_validate(profile)
