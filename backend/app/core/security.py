from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from pwdlib import PasswordHash

from app.core.config import get_settings

password_hash = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = password_hash.hash("project-suiii-dummy-password")


def utc_now() -> datetime:
    return datetime.now(UTC)


def normalize_email(email: str) -> str:
    return email.strip().casefold()


def hash_password(password: str) -> str:
    return password_hash.hash(password + get_settings().password_pepper)


def verify_password(password: str, stored_hash: str | None) -> bool:
    candidate = stored_hash or DUMMY_PASSWORD_HASH
    try:
        return password_hash.verify(password + get_settings().password_pepper, candidate) and stored_hash is not None
    except Exception:
        return False


def new_opaque_token() -> str:
    return secrets.token_urlsafe(48)


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def constant_time_equal(left: str, right: str) -> bool:
    return hmac.compare_digest(left.encode("utf-8"), right.encode("utf-8"))


def session_expiry(remember_me: bool) -> datetime:
    settings = get_settings()
    if remember_me:
        return utc_now() + timedelta(days=settings.remember_me_days)
    return utc_now() + timedelta(minutes=settings.session_minutes)
