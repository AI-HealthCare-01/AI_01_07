from datetime import date

from app.models.checkin import DailyHealthCheck


class HealthRecordRepository:
    def __init__(self):
        self._model = DailyHealthCheck

    async def get_by_user_and_date(self, user_id: int, record_date: date) -> DailyHealthCheck | None:
        return await self._model.get_or_none(user_id=user_id, record_date=record_date)

    async def create(
        self,
        user_id: int,
        record_date: date,
        water_ml: int,
        steps: int,
        exercise_minutes: int,
    ) -> DailyHealthCheck:
        return await self._model.create(
            user_id=user_id,
            record_date=record_date,
            water_ml=water_ml,
            steps=steps,
            exercise_minutes=exercise_minutes,
        )

    async def increase_values(
        self,
        record: DailyHealthCheck,
        water_ml: int,
        steps: int,
        exercise_minutes: int,
    ) -> DailyHealthCheck:
        record.water_ml += water_ml
        record.steps += steps
        record.exercise_minutes += exercise_minutes
        await record.save(update_fields=["water_ml", "steps", "exercise_minutes", "updated_at"])
        return record
