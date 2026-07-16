from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import auth, health, profile, progress, sync, test_control
from app.core.config import get_settings

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(profile.router)
api_router.include_router(progress.router)
api_router.include_router(sync.router)
if get_settings().environment == "test":
    api_router.include_router(test_control.router)
