from __future__ import annotations

from datetime import timedelta
from uuid import UUID

from fastapi import HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    constant_time_equal,
    hash_password,
    new_opaque_token,
    normalize_email,
    session_expiry,
    token_digest,
    utc_now,
    verify_password,
)
from app.models.user import User
from app.models.user_profile import UserProfile
from app.models.user_session import UserSession


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.settings = get_settings()

    async def authenticate(self, email: str, password: str) -> User:
        normalized = normalize_email(email)
        user = await self.db.scalar(select(User).where(User.email_normalized == normalized))
        valid = verify_password(password, user.password_hash if user else None)
        if not valid or user is None or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        user.last_login_at = utc_now()
        return user

    async def create_session(
        self,
        user: User,
        request: Request,
        response: Response,
        remember_me: bool,
        device_name: str | None,
    ) -> tuple[UserSession, str]:
        raw_token = new_opaque_token()
        csrf_token = new_opaque_token()
        expires_at = session_expiry(remember_me)
        session = UserSession(
            user_id=user.id,
            token_hash=token_digest(raw_token),
            csrf_token_hash=token_digest(csrf_token),
            device_name=device_name,
            user_agent=request.headers.get("user-agent"),
            expires_at=expires_at,
            remember_me=remember_me,
        )
        self.db.add(session)
        await self.ensure_profile(user)
        await self.db.commit()
        max_age = int((expires_at - utc_now()).total_seconds())
        self.set_auth_cookies(response, raw_token, csrf_token, max_age)
        return session, csrf_token

    async def ensure_profile(self, user: User) -> None:
        profile = await self.db.get(UserProfile, user.id)
        if profile is None:
            self.db.add(UserProfile(user_id=user.id))

    def set_auth_cookies(self, response: Response, token: str, csrf_token: str, max_age: int) -> None:
        response.set_cookie(
            self.settings.session_cookie_name,
            token,
            max_age=max_age,
            httponly=True,
            secure=self.settings.cookie_secure,
            samesite="lax",
            path="/",
        )
        response.set_cookie(
            self.settings.csrf_cookie_name,
            csrf_token,
            max_age=max_age,
            httponly=False,
            secure=self.settings.cookie_secure,
            samesite="lax",
            path="/",
        )

    def clear_auth_cookies(self, response: Response) -> None:
        response.delete_cookie(self.settings.session_cookie_name, path="/")
        response.delete_cookie(self.settings.csrf_cookie_name, path="/")

    async def session_from_cookie(self, request: Request) -> UserSession | None:
        raw_token = request.cookies.get(self.settings.session_cookie_name)
        if not raw_token:
            return None
        session = await self.db.scalar(select(UserSession).where(UserSession.token_hash == token_digest(raw_token)))
        if session is None or session.revoked_at is not None or session.expires_at <= utc_now():
            return None
        if session.last_seen_at + timedelta(seconds=self.settings.last_seen_write_interval_seconds) < utc_now():
            session.last_seen_at = utc_now()
            await self.db.commit()
        return session

    async def require_user(self, request: Request) -> tuple[User, UserSession]:
        session = await self.session_from_cookie(request)
        if session is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        user = await self.db.get(User, session.user_id)
        if user is None or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        return user, session

    def validate_csrf(self, request: Request, session: UserSession) -> None:
        if request.method in {"GET", "HEAD", "OPTIONS"}:
            return
        origin = request.headers.get("origin")
        host = request.headers.get("host")
        if origin and not any(origin == allowed for allowed in self.settings.allowed_origin_list):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid request origin")
        if not origin and host is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing request origin")
        header = request.headers.get("x-csrf-token")
        if not header or not constant_time_equal(token_digest(header), session.csrf_token_hash):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token")

    async def revoke_session(self, session_id: UUID, user_id: UUID) -> None:
        session = await self.db.get(UserSession, session_id)
        if session and session.user_id == user_id:
            session.revoked_at = utc_now()
            await self.db.commit()

    async def revoke_all(self, user_id: UUID) -> None:
        sessions = (await self.db.scalars(select(UserSession).where(UserSession.user_id == user_id, UserSession.revoked_at.is_(None)))).all()
        for session in sessions:
            session.revoked_at = utc_now()
        await self.db.commit()

    async def create_or_update_user(self, email: str, full_name: str, password: str, is_admin: bool = True) -> User:
        normalized = normalize_email(email)
        user = await self.db.scalar(select(User).where(User.email_normalized == normalized))
        if user is None:
            user = User(email=email, email_normalized=normalized, full_name=full_name, password_hash=hash_password(password), is_admin=is_admin)
            self.db.add(user)
        else:
            user.email = email
            user.full_name = full_name
            user.password_hash = hash_password(password)
            user.is_active = True
            user.is_admin = is_admin
        await self.db.flush()
        await self.ensure_profile(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user
