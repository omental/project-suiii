from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

Weekday = str


class UserProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=160)
    height_cm: Decimal | None = Field(default=None, gt=Decimal("90"), lt=Decimal("250"))
    starting_weight_kg: Decimal | None = Field(default=None, gt=Decimal("20"), lt=Decimal("400"))
    target_weight_min_kg: Decimal | None = Field(default=None, gt=Decimal("20"), lt=Decimal("400"))
    target_weight_max_kg: Decimal | None = Field(default=None, gt=Decimal("20"), lt=Decimal("400"))
    starting_waist_in: Decimal | None = Field(default=None, gt=Decimal("10"), lt=Decimal("100"))
    target_waist_in: Decimal | None = Field(default=None, gt=Decimal("10"), lt=Decimal("100"))
    calorie_target: int | None = Field(default=None, ge=800, le=6000)
    protein_target_g: int | None = Field(default=None, ge=20, le=400)
    water_target_ml: int | None = Field(default=None, ge=250, le=10000)
    timezone: str | None = Field(default=None, min_length=1, max_length=64)
    unit_system: str | None = Field(default=None, pattern="^(metric|imperial)$")
    programme_start_date: date | None = None
    preferred_rest_day: Weekday | None = Field(default=None, max_length=16)
    preferred_workout_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    equipment: list[str] | None = Field(default=None, max_length=32)
    badminton_enabled: bool | None = None
    badminton_days: list[str] | None = Field(default=None, max_length=7)
    badminton_start_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    badminton_end_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    badminton_intensity: str | None = Field(default=None, pattern="^(easy|moderate|hard)$")
    show_exercise_illustrations: bool | None = None
    rest_timer_sound: bool | None = None
    default_rest_seconds: int | None = Field(default=None, ge=15, le=300)
    exercise_substitutions_enabled: bool | None = None
    planned_meals: int | None = Field(default=None, ge=1, le=8)
    kitchen_scale_enabled: bool | None = None
    measurement_unit: str | None = Field(default=None, pattern="^(metric|imperial)$")
    meal_reminders_enabled: bool | None = None
    sleep_target_minutes: int | None = Field(default=None, ge=180, le=720)
    readiness_check_in_enabled: bool | None = None
    weekly_check_in_day: Weekday | None = Field(default=None, max_length=16)
    smoking_tracking_enabled: bool | None = None
    cigarette_baseline: int | None = Field(default=None, ge=0, le=100)
    cigarette_reduction_target: int | None = Field(default=None, ge=0, le=100)
    first_cigarette_delay_minutes: int | None = Field(default=None, ge=0, le=720)
    expected_version: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_ranges(self) -> "UserProfileUpdate":
        if self.target_weight_min_kg is not None and self.target_weight_max_kg is not None and self.target_weight_min_kg > self.target_weight_max_kg:
            raise ValueError("target_weight_min_kg cannot be greater than target_weight_max_kg")
        if self.timezone is not None and self.timezone != "Asia/Dhaka":
            raise ValueError("Only Asia/Dhaka is currently supported for local calendar behavior.")
        if self.programme_start_date is not None and self.programme_start_date > date.today():
            raise ValueError("programme_start_date cannot be in the future")
        return self


class UserProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    height_cm: Decimal
    starting_weight_kg: Decimal
    target_weight_min_kg: Decimal
    target_weight_max_kg: Decimal
    starting_waist_in: Decimal
    target_waist_in: Decimal
    calorie_target: int
    protein_target_g: int
    water_target_ml: int
    timezone: str
    unit_system: str
    programme_start_date: date | None
    profile_configured: bool
    preferred_rest_day: str | None
    preferred_workout_time: str | None
    equipment_csv: str | None
    badminton_enabled: bool
    badminton_days_csv: str | None
    badminton_start_time: str | None
    badminton_end_time: str | None
    badminton_intensity: str | None
    show_exercise_illustrations: bool
    rest_timer_sound: bool
    default_rest_seconds: int | None
    exercise_substitutions_enabled: bool
    planned_meals: int | None
    kitchen_scale_enabled: bool
    measurement_unit: str
    meal_reminders_enabled: bool
    sleep_target_minutes: int | None
    readiness_check_in_enabled: bool
    weekly_check_in_day: str | None
    smoking_tracking_enabled: bool
    cigarette_baseline: int | None
    cigarette_reduction_target: int | None
    first_cigarette_delay_minutes: int | None
    updated_at: datetime
    version: int
