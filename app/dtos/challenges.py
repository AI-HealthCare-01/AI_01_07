from datetime import date, datetime
from typing import Annotated

from pydantic import Field

from app.dtos.base import BaseSerializerModel


class ChallengeDailyUpsertRequest(BaseSerializerModel):
    steps: Annotated[int, Field(ge=0, le=30000)] = 0
    exercise_minutes: Annotated[int, Field(ge=0, le=180)] = 0
    water_cups: Annotated[int, Field(ge=0, le=20)] = 0
    sleep_hours: Annotated[float, Field(ge=0, le=24)] = 0
    no_snack: bool = False


class ChallengeDailyRowResponse(BaseSerializerModel):
    id: int | None = None
    date: date
    steps: int
    exercise_minutes: int
    water_cups: int
    sleep_hours: float
    no_snack: bool
    daily_score: float
    tier: str
    behavior_index: float
    delta: float
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ChallengeDailySummaryResponse(BaseSerializerModel):
    daily_score: float
    tier: str
    behavior_index: float
    delta: float
    message: str
    tags: list[str]


class ChallengeDailyResponse(BaseSerializerModel):
    row: ChallengeDailyRowResponse
    summary: ChallengeDailySummaryResponse


class ChallengeTrendPointResponse(BaseSerializerModel):
    date: date
    daily_score: float
    behavior_index: float
    tier: str
    has_record: bool
