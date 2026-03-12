from datetime import date, datetime, time, timedelta

from fastapi import HTTPException, status
from tortoise.transactions import in_transaction

from app.core import config
from app.dtos.users import (
    ProfileHistoryPoint,
    ProfileRiskPoint,
    UserPasswordChangeRequest,
    UserPasswordVerifyRequest,
    UserProfileOverviewResponse,
    UserUpdateRequest,
)
from app.models.challenges import ChallengeDaily
from app.models.checkin import DailyHealthCheck
from app.models.predictions import DiabetesPrediction, Meal, OnboardingSurvey
from app.models.users import User
from app.repositories.user_repository import UserRepository
from app.services.auth import AuthService
from app.utils.common import normalize_phone_number
from app.utils.security import hash_password, verify_password


class UserManageService:
    def __init__(self):
        self.repo = UserRepository()
        self.auth_service = AuthService()

    async def update_user(self, user: User, data: UserUpdateRequest) -> User:
        if data.email:
            await self.auth_service.check_email_exists(data.email)
        if data.phone_number:
            normalized_phone_number = normalize_phone_number(data.phone_number)
            await self.auth_service.check_phone_number_exists(normalized_phone_number)
            data.phone_number = normalized_phone_number
        async with in_transaction():
            await self.repo.update_instance(user=user, data=data.model_dump(exclude_none=True))
            await user.refresh_from_db()
        return user

    async def delete_user(self, user: User) -> None:
        async with in_transaction():
            await DailyHealthCheck.filter(user=user).delete()
            await OnboardingSurvey.filter(user=user).delete()
            await DiabetesPrediction.filter(user=user).delete()
            await Meal.filter(user=user).delete()
            await self.repo.delete_user(user=user)

    async def change_password(self, user: User, data: UserPasswordChangeRequest) -> None:
        if not verify_password(data.old_password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="기존 비밀번호가 올바르지 않습니다.")

        user.hashed_password = hash_password(data.new_password)
        user.updated_at = datetime.now(config.TIMEZONE)
        await user.save(update_fields=["hashed_password", "updated_at"])

    async def verify_password(self, user: User, data: UserPasswordVerifyRequest) -> None:
        if not verify_password(data.old_password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="기존 비밀번호가 올바르지 않습니다.")

    async def get_profile_overview(self, user: User) -> UserProfileOverviewResponse:
        today = date.today()
        start_date = today - timedelta(days=6)
        end_dt = datetime.combine(today + timedelta(days=1), time.min)

        checks = await ChallengeDaily.filter(user=user, date__gte=start_date, date__lte=today).order_by("date")
        history_by_date = {c.date: c for c in checks}

        risk_rows = await OnboardingSurvey.filter(user=user, created_at__lt=end_dt).order_by("created_at")
        risk_by_date = {}
        last_known_before_window = None
        for row in risk_rows:
            row_date = row.created_at.date()
            row_risk = float(row.risk_probability)
            if row_date < start_date:
                last_known_before_window = row_risk
                continue
            risk_by_date[row_date] = row_risk

        latest = risk_rows[-1] if risk_rows else None
        bmi = float(latest.bmi) if latest else None
        latest_height_cm = float(latest.height_cm) if latest else None
        latest_weight_kg = float(latest.weight_kg) if latest else None

        history_7d = []
        risk_trend_7d = []
        current_risk = float(last_known_before_window or 0.0)
        for i in range(7):
            d = start_date + timedelta(days=i)
            c = history_by_date.get(d)
            history_7d.append(
                ProfileHistoryPoint(
                    date=d,
                    water_ml=int(c.water_cups * 200) if c else 0,
                    steps=int(c.steps) if c else 0,
                    exercise_minutes=int(c.exercise_minutes) if c else 0,
                )
            )
            if d in risk_by_date:
                current_risk = float(risk_by_date[d])
            risk_trend_7d.append(ProfileRiskPoint(date=d, risk_probability=current_risk))

        return UserProfileOverviewResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            birthday=user.birthday,
            gender=user.gender,
            is_admin=user.is_admin,
            onboarding_completed=latest is not None,
            bmi=bmi,
            latest_height_cm=latest_height_cm,
            latest_weight_kg=latest_weight_kg,
            history_7d=history_7d,
            risk_trend_7d=risk_trend_7d,
        )
