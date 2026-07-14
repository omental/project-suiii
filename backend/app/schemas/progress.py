from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

MeasurementSource = Literal["manual", "check_in", "imported"]
CheckInStatus = Literal["draft", "completed"]
WellbeingLevel = Literal["low", "normal", "high"]
DigestionLevel = Literal["good", "some_gas", "difficult"]
PhotoPose = Literal["front", "side", "back"]
ReportType = Literal["weekly", "monthly"]


def bounded_decimal(value: Decimal | None, low: Decimal, high: Decimal, field_name: str) -> Decimal | None:
    if value is None:
        return None
    if not value.is_finite() or value <= low or value >= high:
        raise ValueError(f"{field_name} must be positive and realistically bounded")
    return value


class MeasurementBase(BaseModel):
    measured_at: datetime
    local_date: date
    weight_kg: Decimal | None = None
    waist_in: Decimal | None = None
    chest_in: Decimal | None = None
    arm_in: Decimal | None = None
    thigh_in: Decimal | None = None
    source: MeasurementSource = "manual"
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("weight_kg")
    @classmethod
    def weight_bounds(cls, value: Decimal | None) -> Decimal | None:
        return bounded_decimal(value, Decimal("20"), Decimal("350"), "weight_kg")

    @field_validator("waist_in", "chest_in")
    @classmethod
    def torso_bounds(cls, value: Decimal | None) -> Decimal | None:
        return bounded_decimal(value, Decimal("10"), Decimal("100"), "circumference")

    @field_validator("arm_in")
    @classmethod
    def arm_bounds(cls, value: Decimal | None) -> Decimal | None:
        return bounded_decimal(value, Decimal("4"), Decimal("40"), "arm_in")

    @field_validator("thigh_in")
    @classmethod
    def thigh_bounds(cls, value: Decimal | None) -> Decimal | None:
        return bounded_decimal(value, Decimal("8"), Decimal("60"), "thigh_in")

    @model_validator(mode="after")
    def at_least_one_measurement(self) -> "MeasurementBase":
        if all(getattr(self, field) is None for field in ("weight_kg", "waist_in", "chest_in", "arm_in", "thigh_in")):
            raise ValueError("At least one measurement is required")
        return self


class MeasurementCreate(MeasurementBase):
    client_record_id: str = Field(min_length=1, max_length=180)


class MeasurementPatch(BaseModel):
    measured_at: datetime | None = None
    local_date: date | None = None
    weight_kg: Decimal | None = None
    waist_in: Decimal | None = None
    chest_in: Decimal | None = None
    arm_in: Decimal | None = None
    thigh_in: Decimal | None = None
    source: MeasurementSource | None = None
    note: str | None = Field(default=None, max_length=2000)
    version: int = Field(ge=1)


class MeasurementRead(MeasurementBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    client_record_id: str
    created_at: datetime
    updated_at: datetime
    version: int


class WeeklyCheckInCreate(BaseModel):
    client_record_id: str = Field(min_length=1, max_length=180)
    week_number: int = Field(ge=1, le=104)
    check_in_date: date
    energy: WellbeingLevel | None = None
    hunger: WellbeingLevel | None = None
    digestion: DigestionLevel | None = None
    average_sleep_minutes: int | None = Field(default=None, ge=0, le=1440)
    private_note: str | None = Field(default=None, max_length=4000)
    measurement: MeasurementCreate | None = None


class WeeklyCheckInPatch(BaseModel):
    energy: WellbeingLevel | None = None
    hunger: WellbeingLevel | None = None
    digestion: DigestionLevel | None = None
    average_sleep_minutes: int | None = Field(default=None, ge=0, le=1440)
    private_note: str | None = Field(default=None, max_length=4000)
    measurement_id: UUID | None = None
    version: int = Field(ge=1)


class WeeklyCheckInRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    client_record_id: str
    week_number: int
    check_in_date: date
    status: CheckInStatus
    energy: str | None
    hunger: str | None
    digestion: str | None
    average_sleep_minutes: int | None
    private_note: str | None
    measurement_id: UUID | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    version: int


class PhotoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    check_in_id: UUID
    pose: PhotoPose
    processed_mime_type: str
    width: int
    height: int
    size_bytes: int
    sha256: str
    created_at: datetime


class ProgressPoint(BaseModel):
    date: date
    weight_kg: Decimal | None = None
    waist_in: Decimal | None = None
    week_number: int | None = None


class AdherenceSummary(BaseModel):
    workouts_completed: int
    workouts_planned: int
    meal_completed: int
    meal_planned: int
    protein_days: int
    water_days: int
    badminton_days: int
    friday_rest: bool
    smoking_today: int | None
    smoking_limit: int
    smoking_baseline: Decimal | None
    smoking_seven_day_average: Decimal | None
    smoking_previous_average: Decimal | None
    smoking_percentage_change: Decimal | None


class ForecastResponse(BaseModel):
    available: bool
    reason: str | None = None
    estimated_start: date | None = None
    estimated_end: date | None = None
    data_window: str | None = None
    weekly_rate_kg: Decimal | None = None
    disclaimer: str = "Trend estimate, not a guarantee."


class MilestoneRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    milestone_type: str
    threshold_value: Decimal | None
    achieved_at: datetime
    extra_metadata: dict[str, Any] = Field(alias="metadata", default_factory=dict)


class ProgressSummary(BaseModel):
    programme_day: int
    programme_total_days: int
    current_weight_kg: Decimal | None
    starting_weight_kg: Decimal
    target_weight_min_kg: Decimal
    target_weight_max_kg: Decimal
    weight_change_kg: Decimal | None
    current_waist_in: Decimal | None
    starting_waist_in: Decimal
    target_waist_in: Decimal
    waist_change_in: Decimal | None
    trend_status: str
    check_in_due: bool
    latest_check_in_id: UUID | None = None
    adherence: AdherenceSummary
    recent_milestones: list[MilestoneRead]
    insight: str


class ProgressHistoryResponse(BaseModel):
    points: list[ProgressPoint]
    check_ins: list[WeeklyCheckInRead]


class ReportCreate(BaseModel):
    period_start: date
    period_end: date


class ReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    report_type: ReportType
    period_start: date
    period_end: date
    status: str
    generated_at: datetime
    expires_at: datetime | None
