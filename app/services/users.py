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
        if user.is_guest:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="게스트 계정은 회원정보를 수정할 수 없습니다."
            )
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
        if user.is_guest:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="게스트 계정은 비밀번호를 변경할 수 없습니다."
            )
        if not verify_password(data.old_password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="기존 비밀번호가 올바르지 않습니다.")

        user.hashed_password = hash_password(data.new_password)
        user.updated_at = datetime.now(config.TIMEZONE)
        await user.save(update_fields=["hashed_password", "updated_at"])

    async def verify_password(self, user: User, data: UserPasswordVerifyRequest) -> None:
        if user.is_guest:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="게스트 계정은 비밀번호를 확인할 수 없습니다."
            )
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
        for row in risk_rows:
            risk_by_date[row.created_at.date()] = float(row.risk_probability)

        latest = risk_rows[-1] if risk_rows else None
        bmi = float(latest.bmi) if latest else None
        latest_height_cm = float(latest.height_cm) if latest else None
        latest_weight_kg = float(latest.weight_kg) if latest else None

        history_7d = []
        risk_trend_7d = []
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

        if risk_rows:
            first_risk_date = risk_rows[0].created_at.date()
            current_risk = float(risk_by_date.get(first_risk_date, 0.0))
            day_cursor = first_risk_date
            while day_cursor <= today:
                if day_cursor in risk_by_date:
                    current_risk = float(risk_by_date[day_cursor])
                risk_trend_7d.append(ProfileRiskPoint(date=day_cursor, risk_probability=current_risk))
                day_cursor += timedelta(days=1)

        return UserProfileOverviewResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            birthday=user.birthday,
            gender=user.gender,
            is_admin=user.is_admin,
            is_guest=user.is_guest,
            onboarding_completed=latest is not None,
            bmi=bmi,
            latest_height_cm=latest_height_cm,
            latest_weight_kg=latest_weight_kg,
            history_7d=history_7d,
            risk_trend_7d=risk_trend_7d,
        )
