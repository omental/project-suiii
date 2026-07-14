from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "test", "production"] = Field("development", alias="PROJECT_SUIII_ENV")
    database_url: str = Field(..., alias="DATABASE_URL")
    allowed_origins: str = Field("http://localhost:3000,http://127.0.0.1:3000", alias="ALLOWED_ORIGINS")
    cookie_secure: bool = Field(False, alias="COOKIE_SECURE")
    session_cookie_name: str = Field("suiii_session", alias="SESSION_COOKIE_NAME")
    csrf_cookie_name: str = Field("suiii_csrf", alias="CSRF_COOKIE_NAME")
    password_pepper: str = Field("development-pepper-change-me", alias="PASSWORD_PEPPER")
    session_minutes: int = 60 * 12
    remember_me_days: int = 30
    last_seen_write_interval_seconds: int = 300
    private_upload_root: Path = Field(Path("private_uploads"), alias="PRIVATE_UPLOAD_ROOT")
    max_progress_photo_bytes: int = Field(8 * 1024 * 1024, alias="MAX_PROGRESS_PHOTO_BYTES")
    max_image_pixels: int = Field(16_000_000, alias="MAX_IMAGE_PIXELS")
    processed_photo_max_width: int = Field(1600, alias="PROCESSED_PHOTO_MAX_WIDTH")
    processed_photo_quality: int = Field(82, alias="PROCESSED_PHOTO_QUALITY")

    @field_validator("database_url")
    @classmethod
    def require_postgresql_asyncpg(cls, value: str) -> str:
        if not value.startswith("postgresql+asyncpg://"):
            raise ValueError("DATABASE_URL must use postgresql+asyncpg")
        if "/suii" not in value:
            raise ValueError("DATABASE_URL must point at PostgreSQL database named suii")
        return value

    @property
    def allowed_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
