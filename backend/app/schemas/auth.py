from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)
    remember_me: bool = False
    device_name: str | None = Field(default=None, max_length=120)


class UserRead(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    timezone: str
    is_active: bool
    is_admin: bool


class LoginResponse(BaseModel):
    user: UserRead
    csrf_token: str
    expires_at: datetime


class SessionRead(BaseModel):
    id: UUID
    device_name: str | None
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime
    revoked_at: datetime | None
    remember_me: bool
    current: bool = False
