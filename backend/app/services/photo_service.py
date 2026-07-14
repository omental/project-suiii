from __future__ import annotations

import hashlib
import io
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import utc_now
from app.models.progress_photo import ProgressPhoto
from app.models.weekly_check_in import WeeklyCheckIn

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
OUTPUT_MIME = "image/webp"


class PhotoService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.settings = get_settings()

    def root(self) -> Path:
        root = self.settings.private_upload_root
        if not root.is_absolute():
            root = Path.cwd() / root
        root.mkdir(parents=True, exist_ok=True)
        return root.resolve()

    def path_for(self, storage_key: str) -> Path:
        root = self.root()
        path = (root / storage_key).resolve()
        if root not in path.parents and path != root:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")
        return path

    async def get_check_in(self, user_id: UUID, check_in_id: UUID) -> WeeklyCheckIn:
        check_in = await self.db.get(WeeklyCheckIn, check_in_id)
        if check_in is None or check_in.user_id != user_id or check_in.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Check-in not found")
        return check_in

    async def list_photos(self, user_id: UUID, check_in_id: UUID) -> list[ProgressPhoto]:
        await self.get_check_in(user_id, check_in_id)
        return list(
            (
                await self.db.scalars(
                    select(ProgressPhoto).where(
                        ProgressPhoto.user_id == user_id,
                        ProgressPhoto.check_in_id == check_in_id,
                        ProgressPhoto.deleted_at.is_(None),
                    )
                )
            ).all()
        )

    async def get_photo(self, user_id: UUID, photo_id: UUID) -> ProgressPhoto:
        photo = await self.db.get(ProgressPhoto, photo_id)
        if photo is None or photo.user_id != user_id or photo.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")
        return photo

    async def process_upload(self, user_id: UUID, check_in_id: UUID, pose: str, upload: UploadFile) -> ProgressPhoto:
        await self.get_check_in(user_id, check_in_id)
        data = await upload.read(self.settings.max_progress_photo_bytes + 1)
        if len(data) > self.settings.max_progress_photo_bytes:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Photo is too large")
        try:
            image = Image.open(io.BytesIO(data))
            if getattr(image, "is_animated", False):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Animated images are not supported")
            if image.format not in ALLOWED_FORMATS:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported image format")
            width, height = image.size
            if width * height > self.settings.max_image_pixels:
                raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Photo pixel dimensions are too large")
            image.verify()
            image = Image.open(io.BytesIO(data))
            image = ImageOps.exif_transpose(image).convert("RGB")
        except HTTPException:
            raise
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed image") from exc

        max_width = self.settings.processed_photo_max_width
        if image.width > max_width:
            ratio = max_width / image.width
            image = image.resize((max_width, max(1, int(image.height * ratio))))
        output = io.BytesIO()
        image.save(output, format="WEBP", quality=self.settings.processed_photo_quality, method=6)
        processed = output.getvalue()
        digest = hashlib.sha256(processed).hexdigest()
        storage_key = f"progress_photos/{user_id.hex[:2]}/{uuid4().hex}.webp"
        path = self.path_for(storage_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(processed)

        existing = (
            await self.db.scalars(
                select(ProgressPhoto).where(
                    ProgressPhoto.user_id == user_id,
                    ProgressPhoto.check_in_id == check_in_id,
                    ProgressPhoto.pose == pose,
                    ProgressPhoto.deleted_at.is_(None),
                )
            )
        ).all()
        for photo in existing:
            photo.deleted_at = utc_now()
            old_path = self.path_for(photo.storage_key)
            if old_path.exists():
                old_path.unlink()
        photo = ProgressPhoto(
            user_id=user_id,
            check_in_id=check_in_id,
            pose=pose,
            storage_key=storage_key,
            processed_mime_type=OUTPUT_MIME,
            width=image.width,
            height=image.height,
            size_bytes=len(processed),
            sha256=digest,
        )
        self.db.add(photo)
        await self.db.flush()
        return photo

    async def delete_photo(self, user_id: UUID, photo_id: UUID) -> None:
        photo = await self.get_photo(user_id, photo_id)
        photo.deleted_at = utc_now()
        path = self.path_for(photo.storage_key)
        if path.exists():
            path.unlink()
        await self.db.flush()
