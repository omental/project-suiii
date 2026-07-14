from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


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
    programme_start_date: date | None
    updated_at: datetime
    version: int
