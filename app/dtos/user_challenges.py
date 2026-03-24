from datetime import date, datetime

from app.dtos.base import BaseSerializerModel


class ChallengeTemplateResponse(BaseSerializerModel):
    key: str
    icon: str
    title: str
    description: str
    reminder_hint: str


class UserChallengeCreateRequest(BaseSerializerModel):
    template_key: str


class UserChallengeCheckRequest(BaseSerializerModel):
    done: bool


class UserChallengeItemResponse(BaseSerializerModel):
    id: int
    template_key: str
    title: str
    description: str
    is_active: bool
    today_done: bool
    streak: int
    created_at: datetime


class UserChallengeCheckResponse(BaseSerializerModel):
    id: int
    today_done: bool
    streak: int
    saved_date: date
