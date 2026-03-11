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


class MealFromAnalysisRequest(BaseSerializerModel):
    menu_label: str
    kcal: float
    carb_g: float
    protein_g: float
    fat_g: float


class MealTodayRowResponse(BaseSerializerModel):
    id: int
    menu_label: str | None = None
    kcal: int | None = None
    carb_g: float | None = None
    protein_g: float | None = None
    fat_g: float | None = None
    created_at: datetime


class MealTodaySummaryResponse(BaseSerializerModel):
    total_kcal: int
    total_carb_g: float
    total_protein_g: float
    total_fat_g: float


class MealTodayResponse(BaseSerializerModel):
    rows: list[MealTodayRowResponse]
    summary: MealTodaySummaryResponse
    carb_pct: float
    message: str


class MealFromAnalysisResponse(BaseSerializerModel):
    saved: MealTodayRowResponse
    today: MealTodayResponse
