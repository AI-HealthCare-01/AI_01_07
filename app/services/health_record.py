from datetime import datetime

from tortoise.transactions import in_transaction

from app.core import config
from app.dtos.health_record import HealthRecordSaveRequest, HealthRecordTodayResponse
from app.models.users import User
from app.repositories.health_record_repository import HealthRecordRepository


class HealthRecordService:
    def __init__(self):
        self.repo = HealthRecordRepository()

    async def save_today_record(self, user: User, data: HealthRecordSaveRequest) -> HealthRecordTodayResponse:
        today = datetime.now(config.TIMEZONE).date()

        async with in_transaction():
            record = await self.repo.get_by_user_and_date(user_id=user.id, record_date=today)
            if record is None:
                record = await self.repo.create(
                    user_id=user.id,
                    record_date=today,
                    water_ml=data.water_ml,
                    steps=data.steps,
                    exercise_minutes=data.exercise_minutes,
                )
            else:
                record = await self.repo.increase_values(
                    record=record,
                    water_ml=data.water_ml,
                    steps=data.steps,
                    exercise_minutes=data.exercise_minutes,
                )

        return HealthRecordTodayResponse(
            record_date=record.record_date,
            water_ml=record.water_ml,
            steps=record.steps,
            exercise_minutes=record.exercise_minutes,
        )

    async def get_today_record(self, user: User) -> HealthRecordTodayResponse:
        today = datetime.now(config.TIMEZONE).date()
        record = await self.repo.get_by_user_and_date(user_id=user.id, record_date=today)

        if record is None:
            return HealthRecordTodayResponse(record_date=today, water_ml=0, steps=0, exercise_minutes=0)

        return HealthRecordTodayResponse(
            record_date=record.record_date,
            water_ml=record.water_ml,
            steps=record.steps,
            exercise_minutes=record.exercise_minutes,
        )
