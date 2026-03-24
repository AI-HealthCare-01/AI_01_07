from datetime import datetime

from app.dtos.base import BaseSerializerModel


class FoodSaveRequest(BaseSerializerModel):
    label: str
    name_ko: str | None = None
    kcal: float | None = None


class FoodSaveResponse(BaseSerializerModel):
    id: int
    label: str | None = None
    calories_est: int | None = None
    created_at: datetime
