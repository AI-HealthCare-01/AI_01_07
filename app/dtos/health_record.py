from datetime import date
from typing import Annotated

from pydantic import BaseModel, Field


class HealthRecordSaveRequest(BaseModel):
    water_ml: Annotated[int, Field(ge=0, le=5000, multiple_of=10)] = 0
    steps: Annotated[int, Field(ge=0, le=30000)] = 0
    exercise_minutes: Annotated[int, Field(ge=0, le=180, multiple_of=5)] = 0


class HealthRecordTodayResponse(BaseModel):
    record_date: date
    water_ml: int
    steps: int
    exercise_minutes: int
