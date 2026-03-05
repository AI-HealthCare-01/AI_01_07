from datetime import datetime
from app.dtos.base import BaseSerializerModel

class MealCreateRequest(BaseSerializerModel):
    label: str | None = None
    calories_est: int

class MealCreateResponse(BaseSerializerModel):
    id: int
    label: str | None = None
    calories_est: int
    created_at: datetime