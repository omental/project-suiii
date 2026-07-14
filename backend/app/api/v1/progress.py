from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUserSession
from app.db.session import get_db
from app.models.progress_milestone import ProgressMilestone
from app.schemas.progress import (
    AdherenceSummary,
    ForecastResponse,
    MeasurementCreate,
    MeasurementPatch,
    MeasurementRead,
    MilestoneRead,
    PhotoRead,
    ProgressHistoryResponse,
    ProgressSummary,
    ReportCreate,
    ReportRead,
    WeeklyCheckInCreate,
    WeeklyCheckInPatch,
    WeeklyCheckInRead,
)
from app.services.photo_service import PhotoService
from app.services.progress_service import ProgressService
from app.services.report_service import ReportService

router = APIRouter(tags=["progress"])


@router.get("/measurements", response_model=list[MeasurementRead])
async def list_measurements(current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> list[MeasurementRead]:
    user, _ = current
    return [MeasurementRead.model_validate(row) for row in await ProgressService(db).list_measurements(user.id)]


@router.post("/measurements", response_model=MeasurementRead, status_code=status.HTTP_201_CREATED)
async def create_measurement(payload: MeasurementCreate, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> MeasurementRead:
    user, _ = current
    row = await ProgressService(db).create_measurement(user.id, payload)
    await db.commit()
    return MeasurementRead.model_validate(row)


@router.get("/measurements/{measurement_id}", response_model=MeasurementRead)
async def get_measurement(measurement_id: UUID, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> MeasurementRead:
    user, _ = current
    return MeasurementRead.model_validate(await ProgressService(db).get_measurement(user.id, measurement_id))


@router.patch("/measurements/{measurement_id}", response_model=MeasurementRead)
async def patch_measurement(measurement_id: UUID, payload: MeasurementPatch, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> MeasurementRead:
    user, _ = current
    row = await ProgressService(db).patch_measurement(user.id, measurement_id, payload)
    await db.commit()
    return MeasurementRead.model_validate(row)


@router.delete("/measurements/{measurement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_measurement(measurement_id: UUID, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> None:
    user, _ = current
    await ProgressService(db).delete_measurement(user.id, measurement_id)
    await db.commit()


@router.get("/check-ins", response_model=list[WeeklyCheckInRead])
async def list_check_ins(current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> list[WeeklyCheckInRead]:
    user, _ = current
    return [WeeklyCheckInRead.model_validate(row) for row in await ProgressService(db).list_check_ins(user.id)]


@router.post("/check-ins", response_model=WeeklyCheckInRead, status_code=status.HTTP_201_CREATED)
async def create_check_in(payload: WeeklyCheckInCreate, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> WeeklyCheckInRead:
    user, _ = current
    row = await ProgressService(db).create_check_in(user.id, payload)
    await db.commit()
    return WeeklyCheckInRead.model_validate(row)


@router.get("/check-ins/{check_in_id}", response_model=WeeklyCheckInRead)
async def get_check_in(check_in_id: UUID, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> WeeklyCheckInRead:
    user, _ = current
    return WeeklyCheckInRead.model_validate(await ProgressService(db).get_check_in(user.id, check_in_id))


@router.patch("/check-ins/{check_in_id}", response_model=WeeklyCheckInRead)
async def patch_check_in(check_in_id: UUID, payload: WeeklyCheckInPatch, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> WeeklyCheckInRead:
    user, _ = current
    row = await ProgressService(db).patch_check_in(user.id, check_in_id, payload)
    await db.commit()
    return WeeklyCheckInRead.model_validate(row)


@router.post("/check-ins/{check_in_id}/complete", response_model=WeeklyCheckInRead)
async def complete_check_in(check_in_id: UUID, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> WeeklyCheckInRead:
    user, _ = current
    row = await ProgressService(db).complete_check_in(user.id, check_in_id)
    await db.commit()
    return WeeklyCheckInRead.model_validate(row)


@router.post("/check-ins/{check_in_id}/photos", response_model=PhotoRead, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    check_in_id: UUID,
    current: CurrentUserSession,
    db: Annotated[AsyncSession, Depends(get_db)],
    pose: str = Form(...),
    file: UploadFile = File(...),
) -> PhotoRead:
    user, _ = current
    row = await PhotoService(db).process_upload(user.id, check_in_id, pose, file)
    await db.commit()
    return PhotoRead.model_validate(row)


@router.get("/check-ins/{check_in_id}/photos", response_model=list[PhotoRead])
async def list_photos(check_in_id: UUID, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> list[PhotoRead]:
    user, _ = current
    return [PhotoRead.model_validate(row) for row in await PhotoService(db).list_photos(user.id, check_in_id)]


@router.get("/photos/{photo_id}")
async def get_photo(photo_id: UUID, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> FileResponse:
    user, _ = current
    service = PhotoService(db)
    photo = await service.get_photo(user.id, photo_id)
    response = FileResponse(service.path_for(photo.storage_key), media_type=photo.processed_mime_type, filename=f"project-suiii-{photo.pose}.webp")
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Content-Disposition"] = f'inline; filename="project-suiii-{photo.pose}.webp"'
    return response


@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(photo_id: UUID, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> None:
    user, _ = current
    await PhotoService(db).delete_photo(user.id, photo_id)
    await db.commit()


@router.get("/progress/summary", response_model=ProgressSummary)
async def progress_summary(current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> ProgressSummary:
    user, _ = current
    return await ProgressService(db).summary(user.id)


@router.get("/progress/history", response_model=ProgressHistoryResponse)
async def progress_history(current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> ProgressHistoryResponse:
    user, _ = current
    return await ProgressService(db).history(user.id)


@router.get("/progress/adherence", response_model=AdherenceSummary)
async def progress_adherence(current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> AdherenceSummary:
    user, _ = current
    return await ProgressService(db).adherence(user.id)


@router.get("/progress/forecast", response_model=ForecastResponse)
async def progress_forecast(current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> ForecastResponse:
    user, _ = current
    return await ProgressService(db).forecast(user.id)


@router.get("/progress/milestones", response_model=list[MilestoneRead])
async def progress_milestones(current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> list[MilestoneRead]:
    user, _ = current
    await ProgressService(db).detect_milestones(user.id)
    rows = (await db.scalars(select(ProgressMilestone).where(ProgressMilestone.user_id == user.id))).all()
    return [MilestoneRead.model_validate(row) for row in rows]


@router.post("/reports/weekly", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
async def weekly_report(payload: ReportCreate, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> ReportRead:
    user, _ = current
    report = await ReportService(db).generate(user, "weekly", payload)
    await db.commit()
    return ReportRead.model_validate(report)


@router.post("/reports/monthly", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
async def monthly_report(payload: ReportCreate, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> ReportRead:
    user, _ = current
    report = await ReportService(db).generate(user, "monthly", payload)
    await db.commit()
    return ReportRead.model_validate(report)


@router.get("/reports/{report_id}", response_model=ReportRead)
async def get_report(report_id: UUID, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> ReportRead:
    user, _ = current
    return ReportRead.model_validate(await ReportService(db).get(user.id, report_id))


@router.get("/reports/{report_id}/download")
async def download_report(report_id: UUID, current: CurrentUserSession, db: Annotated[AsyncSession, Depends(get_db)]) -> FileResponse:
    user, _ = current
    service = ReportService(db)
    report = await service.get(user.id, report_id)
    response = FileResponse(service.path_for(report.storage_key), media_type="application/pdf", filename=f"project-suiii-{report.report_type}-{report.period_start}.pdf")
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Content-Disposition"] = f'attachment; filename="project-suiii-{report.report_type}-{report.period_start}.pdf"'
    return response
