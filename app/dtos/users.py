from datetime import date, datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, EmailStr, Field

from app.dtos.base import BaseSerializerModel
from app.models.users import Gender
from app.validators.common import optional_after_validator
from app.validators.user_validators import validate_birthday, validate_password, validate_phone_number


class UserUpdateRequest(BaseModel):
    name: Annotated[str | None, Field(None, min_length=2, max_length=20)]
    email: Annotated[
        EmailStr | None,
        Field(None, max_length=40),
    ]
    phone_number: Annotated[
        str | None,
        Field(None, description="Available Format: +8201011112222, 01011112222, 010-1111-2222"),
        optional_after_validator(validate_phone_number),
    ]
    birthday: Annotated[
        date | None,
        Field(None, description="Date Format: YYYY-MM-DD"),
        optional_after_validator(validate_birthday),
    ]
    gender: Annotated[
        Gender | None,
        Field(None, description="'MALE' or 'FEMALE'"),
    ]


class UserInfoResponse(BaseSerializerModel):
    id: int
    name: str
    email: str
    phone_number: str
    birthday: date
    gender: Gender
    is_admin: bool
    created_at: datetime


class UserPasswordChangeRequest(BaseModel):
    old_password: Annotated[str, Field(min_length=8)]
    new_password: Annotated[str, Field(min_length=8), AfterValidator(validate_password)]


class UserPasswordVerifyRequest(BaseModel):
    old_password: Annotated[str, Field(min_length=8)]


class ProfileHistoryPoint(BaseSerializerModel):
    date: date
    water_ml: int
    steps: int
    exercise_minutes: int


class ProfileRiskPoint(BaseSerializerModel):
    date: date
    risk_probability: float


class UserProfileOverviewResponse(BaseSerializerModel):
    id: int
    name: str
    email: str
    birthday: date
    gender: Gender
    is_admin: bool
    onboarding_completed: bool
    bmi: float | None
    latest_height_cm: float | None
    latest_weight_kg: float | None
    history_7d: list[ProfileHistoryPoint]
    risk_trend_7d: list[ProfileRiskPoint]


class AdminUserListItemResponse(BaseSerializerModel):
    id: int
    name: str
    email: str
    phone_number: str
    gender: Gender
    is_active: bool
    is_admin: bool
    created_at: datetime
    last_login: datetime | None


class AdminUserListResponse(BaseSerializerModel):
    page: int
    size: int
    total: int
    items: list[AdminUserListItemResponse]
