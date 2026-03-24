from datetime import datetime, timedelta

from httpx import ASGITransport, AsyncClient
from starlette import status
from tortoise.contrib.test import TestCase

from app.core import config
from app.main import app
from app.models.challenges import ChallengeDaily


class TestChallengeDailyApi(TestCase):
    async def _signup_and_login(self, client: AsyncClient, email: str) -> str:
        await client.post(
            "/api/v1/auth/signup",
            json={
                "email": email,
                "password": "Password123!",
                "name": "챌린지테스터",
                "gender": "FEMALE",
                "birth_date": "1993-01-01",
                "phone_number": "01011112222",
            },
        )
        login_response = await client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
        return login_response.json()["access_token"]

    async def test_upsert_and_get_today(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            access_token = await self._signup_and_login(client, "challenge_today@example.com")
            headers = {"Authorization": f"Bearer {access_token}"}

            response = await client.post(
                "/api/v1/challenges/daily",
                json={
                    "steps": 8500,
                    "exercise_minutes": 35,
                    "water_cups": 6,
                    "sleep_hours": 7.5,
                    "no_snack": True,
                },
                headers=headers,
            )
            assert response.status_code == status.HTTP_200_OK
            payload = response.json()
            assert payload["summary"]["tier"] == "success"
            assert payload["summary"]["daily_score"] == 246.2
            assert payload["summary"]["behavior_index"] == 0.47

            today_response = await client.get("/api/v1/challenges/today", headers=headers)
            assert today_response.status_code == status.HTTP_200_OK
            today = today_response.json()
            assert today["row"]["steps"] == 8500
            assert today["summary"]["message"]

    async def test_daily_inputs_accumulate_and_morning_fields_can_be_updated(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            access_token = await self._signup_and_login(client, "challenge_accumulate@example.com")
            headers = {"Authorization": f"Bearer {access_token}"}

            first_response = await client.post(
                "/api/v1/challenges/daily",
                json={
                    "steps": 3000,
                    "exercise_minutes": 15,
                    "water_cups": 2,
                    "sleep_hours": 7.0,
                    "no_snack": True,
                },
                headers=headers,
            )
            assert first_response.status_code == status.HTTP_200_OK

            second_response = await client.post(
                "/api/v1/challenges/daily",
                json={
                    "steps": 2500,
                    "exercise_minutes": 20,
                    "water_cups": 3,
                    "sleep_hours": 5.0,
                    "no_snack": False,
                },
                headers=headers,
            )
            assert second_response.status_code == status.HTTP_200_OK
            payload = second_response.json()
            assert payload["row"]["steps"] == 5500
            assert payload["row"]["exercise_minutes"] == 35
            assert payload["row"]["water_cups"] == 5
            assert payload["row"]["sleep_hours"] == 5.0
            assert payload["row"]["no_snack"] is False

    async def test_trend_returns_requested_days(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            access_token = await self._signup_and_login(client, "challenge_trend@example.com")
            headers = {"Authorization": f"Bearer {access_token}"}

            response = await client.post(
                "/api/v1/challenges/daily",
                json={
                    "steps": 4000,
                    "exercise_minutes": 20,
                    "water_cups": 3,
                    "sleep_hours": 6,
                    "no_snack": False,
                },
                headers=headers,
            )
            assert response.status_code == status.HTTP_200_OK

            created_id = response.json()["row"]["id"]
            yesterday = datetime.now(config.TIMEZONE).date() - timedelta(days=1)
            await ChallengeDaily.filter(id=created_id).update(date=yesterday, behavior_index=0.53)

            trend_response = await client.get("/api/v1/challenges/trend?days=7", headers=headers)
            assert trend_response.status_code == status.HTTP_200_OK
            trend = trend_response.json()
            assert len(trend) == 7
            assert trend[-2]["date"] == yesterday.isoformat()
            assert trend[-2]["behavior_index"] == 0.53
            assert trend[-2]["has_record"] is True
            assert trend[-1]["has_record"] is False

    async def test_challenge_today_unauthorized(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/challenges/today")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
