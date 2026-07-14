from __future__ import annotations

from pathlib import Path
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.generated_report import GeneratedReport
from app.models.user import User
from app.schemas.progress import ReportCreate
from app.services.progress_service import ProgressService


class ReportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.settings = get_settings()

    def root(self) -> Path:
        root = self.settings.private_upload_root
        if not root.is_absolute():
            root = Path.cwd() / root
        path = (root / "reports").resolve()
        path.mkdir(parents=True, exist_ok=True)
        return path

    def path_for(self, storage_key: str) -> Path:
        root = self.root()
        path = (root / storage_key).resolve()
        if root not in path.parents and path != root:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        return path

    async def generate(self, user: User, report_type: str, payload: ReportCreate) -> GeneratedReport:
        existing = await self.db.scalar(
            select(GeneratedReport).where(
                GeneratedReport.user_id == user.id,
                GeneratedReport.report_type == report_type,
                GeneratedReport.period_start == payload.period_start,
                GeneratedReport.period_end == payload.period_end,
                GeneratedReport.deleted_at.is_(None),
            )
        )
        if existing:
            return existing
        summary = await ProgressService(self.db).summary(user.id)
        forecast = await ProgressService(self.db).forecast(user.id)
        storage_key = f"{report_type}-{payload.period_start.isoformat()}-{payload.period_end.isoformat()}-{uuid4().hex}.pdf"
        path = self.path_for(storage_key)
        c = canvas.Canvas(str(path), pagesize=letter)
        width, height = letter
        y = height - 56
        c.setFillColor(colors.HexColor("#111111"))
        c.rect(0, 0, width, height, fill=True, stroke=False)
        c.setFillColor(colors.HexColor("#c6ff24"))
        c.setFont("Helvetica-Bold", 22)
        c.drawString(48, y, f"Project SUIII {report_type.title()} Report")
        y -= 34
        c.setFillColor(colors.white)
        c.setFont("Helvetica", 11)
        c.drawString(48, y, f"{user.full_name} | {payload.period_start.isoformat()} to {payload.period_end.isoformat()}")
        y -= 34
        lines = [
            f"Programme day: {summary.programme_day} of {summary.programme_total_days}",
            f"Weight: {summary.current_weight_kg or 'No measurement'} kg | Start {summary.starting_weight_kg} kg | Target {summary.target_weight_min_kg}-{summary.target_weight_max_kg} kg",
            f"Waist at navel: {summary.current_waist_in or 'No measurement'} in | Start {summary.starting_waist_in} in | Target {summary.target_waist_in} in",
            f"Workouts: {summary.adherence.workouts_completed}/{summary.adherence.workouts_planned}",
            f"Meals: {summary.adherence.meal_completed}/{summary.adherence.meal_planned}",
            f"Water target days: {summary.adherence.water_days}/7",
            f"Badminton days: {summary.adherence.badminton_days}",
            f"Smoking seven-day average: {summary.adherence.smoking_seven_day_average or 'Not established'}",
            f"Coaching insight: {summary.insight}",
            f"Forecast: {forecast.estimated_start} to {forecast.estimated_end}" if forecast.available else f"Forecast unavailable: {forecast.reason}",
            "Trend estimate, not a guarantee. Photos are not included in this report.",
        ]
        for line in lines:
            c.drawString(48, y, line)
            y -= 22
        c.save()
        report = GeneratedReport(user_id=user.id, report_type=report_type, period_start=payload.period_start, period_end=payload.period_end, storage_key=storage_key)
        self.db.add(report)
        await self.db.flush()
        return report

    async def get(self, user_id: UUID, report_id: UUID) -> GeneratedReport:
        report = await self.db.get(GeneratedReport, report_id)
        if report is None or report.user_id != user_id or report.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        return report
