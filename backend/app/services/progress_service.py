from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import utc_now
from app.models.body_measurement import BodyMeasurement
from app.models.daily_tracking import DailyTracking
from app.models.meal_log import MealLog
from app.models.progress_milestone import ProgressMilestone
from app.models.user import User
from app.models.user_profile import UserProfile
from app.models.weekly_check_in import WeeklyCheckIn
from app.models.workout_session import WorkoutSession
from app.schemas.progress import (
    AdherenceSummary,
    ForecastResponse,
    MeasurementCreate,
    MeasurementPatch,
    ProgressHistoryResponse,
    ProgressPoint,
    ProgressSummary,
    WeeklyCheckInCreate,
    WeeklyCheckInRead,
)

PROGRAMME_DAYS = 90
DHAKA_TZ = ZoneInfo("Asia/Dhaka")


def q(value: Decimal | int | float | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def today_dhaka() -> date:
    return utc_now().astimezone(DHAKA_TZ).date()


class ProgressService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_measurements(self, user_id: UUID) -> list[BodyMeasurement]:
        return list(
            (
                await self.db.scalars(
                    select(BodyMeasurement)
                    .where(BodyMeasurement.user_id == user_id, BodyMeasurement.deleted_at.is_(None))
                    .order_by(BodyMeasurement.measured_at.desc())
                )
            ).all()
        )

    async def get_measurement(self, user_id: UUID, measurement_id: UUID) -> BodyMeasurement:
        measurement = await self.db.get(BodyMeasurement, measurement_id)
        if measurement is None or measurement.user_id != user_id or measurement.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Measurement not found")
        return measurement

    async def create_measurement(self, user_id: UUID, payload: MeasurementCreate) -> BodyMeasurement:
        existing = await self.db.scalar(
            select(BodyMeasurement).where(
                BodyMeasurement.user_id == user_id,
                BodyMeasurement.client_record_id == payload.client_record_id,
            )
        )
        if existing and existing.deleted_at is None:
            return existing
        measurement = BodyMeasurement(user_id=user_id, **payload.model_dump())
        self.db.add(measurement)
        await self.db.flush()
        return measurement

    async def patch_measurement(self, user_id: UUID, measurement_id: UUID, payload: MeasurementPatch) -> BodyMeasurement:
        measurement = await self.get_measurement(user_id, measurement_id)
        if payload.version < measurement.version:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Measurement has a newer server version")
        data = payload.model_dump(exclude_unset=True)
        data.pop("version", None)
        for field, value in data.items():
            setattr(measurement, field, value)
        measurement.version += 1
        await self.db.flush()
        return measurement

    async def delete_measurement(self, user_id: UUID, measurement_id: UUID) -> None:
        measurement = await self.get_measurement(user_id, measurement_id)
        measurement.deleted_at = utc_now()
        measurement.version += 1
        await self.db.flush()

    async def list_check_ins(self, user_id: UUID) -> list[WeeklyCheckIn]:
        return list(
            (
                await self.db.scalars(
                    select(WeeklyCheckIn)
                    .where(WeeklyCheckIn.user_id == user_id, WeeklyCheckIn.deleted_at.is_(None))
                    .order_by(WeeklyCheckIn.week_number.desc(), WeeklyCheckIn.check_in_date.desc())
                )
            ).all()
        )

    async def get_check_in(self, user_id: UUID, check_in_id: UUID) -> WeeklyCheckIn:
        check_in = await self.db.get(WeeklyCheckIn, check_in_id)
        if check_in is None or check_in.user_id != user_id or check_in.deleted_at is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Check-in not found")
        return check_in

    async def create_check_in(self, user_id: UUID, payload: WeeklyCheckInCreate) -> WeeklyCheckIn:
        existing = await self.db.scalar(
            select(WeeklyCheckIn).where(
                WeeklyCheckIn.user_id == user_id,
                WeeklyCheckIn.client_record_id == payload.client_record_id,
            )
        )
        if existing and existing.deleted_at is None:
            return existing
        measurement_id = None
        if payload.measurement:
            measurement = await self.create_measurement(user_id, payload.measurement)
            measurement.source = "check_in"
            measurement_id = measurement.id
        data = payload.model_dump(exclude={"measurement"})
        check_in = WeeklyCheckIn(user_id=user_id, measurement_id=measurement_id, **data)
        self.db.add(check_in)
        await self.db.flush()
        return check_in

    async def patch_check_in(self, user_id: UUID, check_in_id: UUID, payload) -> WeeklyCheckIn:
        check_in = await self.get_check_in(user_id, check_in_id)
        if payload.version < check_in.version:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Check-in has a newer server version")
        data = payload.model_dump(exclude_unset=True)
        data.pop("version", None)
        if data.get("measurement_id") is not None:
            await self.get_measurement(user_id, data["measurement_id"])
        for field, value in data.items():
            setattr(check_in, field, value)
        check_in.version += 1
        await self.db.flush()
        return check_in

    async def complete_check_in(self, user_id: UUID, check_in_id: UUID) -> WeeklyCheckIn:
        check_in = await self.get_check_in(user_id, check_in_id)
        duplicate = await self.db.scalar(
            select(WeeklyCheckIn).where(
                WeeklyCheckIn.user_id == user_id,
                WeeklyCheckIn.week_number == check_in.week_number,
                WeeklyCheckIn.status == "completed",
                WeeklyCheckIn.id != check_in.id,
                WeeklyCheckIn.deleted_at.is_(None),
            )
        )
        if duplicate:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A completed check-in already exists for this week")
        check_in.status = "completed"
        check_in.completed_at = utc_now()
        check_in.version += 1
        await self.detect_milestones(user_id)
        await self.db.flush()
        return check_in

    async def profile(self, user_id: UUID) -> UserProfile:
        profile = await self.db.get(UserProfile, user_id)
        if profile is None:
            profile = UserProfile(user_id=user_id)
            self.db.add(profile)
            await self.db.flush()
        return profile

    async def programme_start_date(self, user_id: UUID, profile: UserProfile) -> date:
        if profile.programme_start_date is not None:
            return profile.programme_start_date
        candidates = [
            await self.db.scalar(select(func.min(BodyMeasurement.local_date)).where(BodyMeasurement.user_id == user_id, BodyMeasurement.deleted_at.is_(None))),
            await self.db.scalar(select(func.min(WeeklyCheckIn.check_in_date)).where(WeeklyCheckIn.user_id == user_id, WeeklyCheckIn.deleted_at.is_(None))),
            await self.db.scalar(select(func.min(MealLog.local_date)).where(MealLog.user_id == user_id)),
            await self.db.scalar(select(func.min(WorkoutSession.local_date)).where(WorkoutSession.user_id == user_id)),
            await self.db.scalar(select(func.min(DailyTracking.tracking_date)).where(DailyTracking.user_id == user_id)),
        ]
        user = await self.db.get(User, user_id)
        if user is not None:
            candidates.append(user.created_at.astimezone(DHAKA_TZ).date())
        start = min(candidate for candidate in candidates if candidate is not None) if any(candidate is not None for candidate in candidates) else today_dhaka()
        profile.programme_start_date = start
        await self.db.flush()
        return start

    async def adherence(self, user_id: UUID) -> AdherenceSummary:
        today = today_dhaka()
        start = today - timedelta(days=6)
        meal_completed = await self.db.scalar(
            select(func.count()).select_from(MealLog).where(MealLog.user_id == user_id, MealLog.status == "completed", MealLog.local_date >= start)
        )
        workout_completed = await self.db.scalar(
            select(func.count()).select_from(WorkoutSession).where(WorkoutSession.user_id == user_id, WorkoutSession.status == "completed", WorkoutSession.local_date >= start)
        )
        daily_rows = (
            await self.db.scalars(
                select(DailyTracking).where(DailyTracking.user_id == user_id, DailyTracking.tracking_date >= start).order_by(DailyTracking.tracking_date)
            )
        ).all()
        water_days = sum(1 for row in daily_rows if row.water_ml >= 3000)
        badminton_days = sum(1 for row in daily_rows if (row.badminton_games or 0) > 0)
        cigarette_values = [row.cigarettes for row in daily_rows]
        previous_rows = (
            await self.db.scalars(
                select(DailyTracking).where(
                    DailyTracking.user_id == user_id,
                    DailyTracking.tracking_date >= start - timedelta(days=7),
                    DailyTracking.tracking_date < start,
                )
            )
        ).all()
        previous_values = [row.cigarettes for row in previous_rows]
        current_avg = q(sum(cigarette_values) / len(cigarette_values)) if cigarette_values else None
        previous_avg = q(sum(previous_values) / len(previous_values)) if previous_values else None
        percentage = q(((current_avg - previous_avg) / previous_avg) * 100) if current_avg is not None and previous_avg not in (None, Decimal("0.00")) else None
        return AdherenceSummary(
            workouts_completed=int(workout_completed or 0),
            workouts_planned=3,
            meal_completed=int(meal_completed or 0),
            meal_planned=35,
            protein_days=0,
            water_days=water_days,
            badminton_days=badminton_days,
            friday_rest=True,
            smoking_today=cigarette_values[-1] if cigarette_values else None,
            smoking_limit=12,
            smoking_baseline=Decimal("20.00") if cigarette_values or previous_values else None,
            smoking_seven_day_average=current_avg,
            smoking_previous_average=previous_avg,
            smoking_percentage_change=percentage,
        )

    async def history(self, user_id: UUID) -> ProgressHistoryResponse:
        measurements = list(reversed(await self.list_measurements(user_id)))
        check_ins = [WeeklyCheckInRead.model_validate(item) for item in await self.list_check_ins(user_id)]
        points = [
            ProgressPoint(date=item.local_date, weight_kg=item.weight_kg, waist_in=item.waist_in)
            for item in measurements
        ]
        return ProgressHistoryResponse(points=points, check_ins=check_ins)

    async def forecast(self, user_id: UUID) -> ForecastResponse:
        profile = await self.profile(user_id)
        measurements = [m for m in reversed(await self.list_measurements(user_id)) if m.weight_kg is not None]
        if len(measurements) < 3:
            return ForecastResponse(available=False, reason="At least three weekly measurements are required.")
        span_days = (measurements[-1].local_date - measurements[0].local_date).days
        if span_days < 14:
            return ForecastResponse(available=False, reason="Measurements must be separated by enough time.")
        weekly_rate = q((measurements[-1].weight_kg - measurements[0].weight_kg) / Decimal(span_days) * Decimal(7))
        if weekly_rate is None or weekly_rate >= 0:
            return ForecastResponse(available=False, reason="Trend is flat or away from the target range.")
        if abs(weekly_rate) > Decimal("1.25"):
            return ForecastResponse(available=False, reason="Recent rate is too noisy or implausible for a conservative estimate.")
        current = measurements[-1].weight_kg
        target = profile.target_weight_max_kg
        if current <= target:
            return ForecastResponse(available=False, reason="Current weight is already within the target range.")
        weeks = (current - target) / abs(weekly_rate)
        start = measurements[-1].local_date + timedelta(days=int(max(1, weeks - 1) * 7))
        end = measurements[-1].local_date + timedelta(days=int((weeks + 2) * 7))
        return ForecastResponse(
            available=True,
            estimated_start=start,
            estimated_end=end,
            data_window=f"{measurements[0].local_date.isoformat()} to {measurements[-1].local_date.isoformat()}",
            weekly_rate_kg=weekly_rate,
        )

    async def detect_milestones(self, user_id: UUID) -> None:
        profile = await self.profile(user_id)
        measurements = await self.list_measurements(user_id)
        current = measurements[0] if measurements else None
        candidates: list[tuple[str, Decimal | None, dict]] = []
        completed_count = await self.db.scalar(
            select(func.count()).select_from(WeeklyCheckIn).where(WeeklyCheckIn.user_id == user_id, WeeklyCheckIn.status == "completed")
        )
        if completed_count:
            candidates.append(("first_weekly_check_in", Decimal("1"), {"count": int(completed_count)}))
        if current and current.weight_kg is not None:
            lost = profile.starting_weight_kg - current.weight_kg
            if lost >= 1:
                candidates.append(("weight_lost_kg", Decimal("1"), {"lost_kg": str(q(lost))}))
            if lost >= 2:
                candidates.append(("weight_lost_kg", Decimal("2"), {"lost_kg": str(q(lost))}))
        if current and current.waist_in is not None and profile.starting_waist_in - current.waist_in >= 1:
            candidates.append(("waist_lost_in", Decimal("1"), {"lost_in": str(q(profile.starting_waist_in - current.waist_in))}))
        for milestone_type, threshold, metadata in candidates:
            existing = await self.db.scalar(
                select(ProgressMilestone).where(
                    ProgressMilestone.user_id == user_id,
                    ProgressMilestone.milestone_type == milestone_type,
                    ProgressMilestone.threshold_value == threshold,
                )
            )
            if existing is None:
                self.db.add(ProgressMilestone(user_id=user_id, milestone_type=milestone_type, threshold_value=threshold, extra_metadata=metadata))

    async def summary(self, user_id: UUID) -> ProgressSummary:
        profile = await self.profile(user_id)
        measurements = await self.list_measurements(user_id)
        current = measurements[0] if measurements else None
        adherence = await self.adherence(user_id)
        milestones = (
            await self.db.scalars(
                select(ProgressMilestone)
                .where(ProgressMilestone.user_id == user_id)
                .order_by(ProgressMilestone.achieved_at.desc())
                .limit(3)
            )
        ).all()
        latest_check_in = await self.db.scalar(
            select(WeeklyCheckIn)
            .where(WeeklyCheckIn.user_id == user_id, WeeklyCheckIn.deleted_at.is_(None))
            .order_by(WeeklyCheckIn.check_in_date.desc())
        )
        start = await self.programme_start_date(user_id, profile)
        day = max(1, min(PROGRAMME_DAYS, (today_dhaka() - start).days + 1))
        weight_change = q(current.weight_kg - profile.starting_weight_kg) if current and current.weight_kg is not None else None
        waist_change = q(current.waist_in - profile.starting_waist_in) if current and current.waist_in is not None else None
        if len(measurements) < 2:
            trend = "Not enough data for a trend"
        elif (weight_change is not None and weight_change < 0) or (waist_change is not None and waist_change < 0):
            trend = "On track"
        else:
            trend = "Review adherence before changing targets"
        insight = "One measurement is a check-in, not proof of progress." if len(measurements) <= 1 else "Review adherence before changing targets."
        if waist_change is not None and waist_change < 0 and adherence.workouts_completed >= 2:
            insight = "Current approach appears consistent with the goal."
        return ProgressSummary(
            programme_day=day,
            programme_total_days=PROGRAMME_DAYS,
            current_weight_kg=current.weight_kg if current else None,
            starting_weight_kg=profile.starting_weight_kg,
            target_weight_min_kg=profile.target_weight_min_kg,
            target_weight_max_kg=profile.target_weight_max_kg,
            weight_change_kg=weight_change,
            current_waist_in=current.waist_in if current else None,
            starting_waist_in=profile.starting_waist_in,
            target_waist_in=profile.target_waist_in,
            waist_change_in=waist_change,
            trend_status=trend,
            check_in_due=today_dhaka().weekday() == 5,
            latest_check_in_id=latest_check_in.id if latest_check_in else None,
            adherence=adherence,
            recent_milestones=list(milestones),
            insight=insight,
        )
