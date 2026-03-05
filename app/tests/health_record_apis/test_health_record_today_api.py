from httpx import ASGITransport, AsyncClient
from starlette import status
from tortoise.contrib.test import TestCase

from app.main import app


class TestHealthRecordTodayApi(TestCase):
    async def _issue_access_token(self, client: AsyncClient, email: str) -> str:
        signup_data = {
            "email": email,
            "password": "Password123!",
            "name": "체크인테스터",
            "gender": "MALE",
            "birth_date": "1992-03-03",
            "phone_number": "01012345678",
        }
        await client.post("/api/v1/auth/signup", json=signup_data)
        login_response = await client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
        return login_response.json()["access_token"]

    async def test_get_today_health_record_default_zero(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            access_token = await self._issue_access_token(client, "health_record_default@example.com")
            headers = {"Authorization": f"Bearer {access_token}"}
            response = await client.get("/api/v1/health-record/today", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["water_ml"] == 0
        assert response.json()["steps"] == 0
        assert response.json()["exercise_minutes"] == 0

    async def test_save_today_health_record_accumulates_values(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            access_token = await self._issue_access_token(client, "health_record_accumulate@example.com")
            headers = {"Authorization": f"Bearer {access_token}"}

            first_payload = {"water_ml": 300, "steps": 1000, "exercise_minutes": 20}
            second_payload = {"water_ml": 200, "steps": 500, "exercise_minutes": 10}

            first_response = await client.post("/api/v1/health-record/today", json=first_payload, headers=headers)
            second_response = await client.post("/api/v1/health-record/today", json=second_payload, headers=headers)
            today_response = await client.get("/api/v1/health-record/today", headers=headers)

        assert first_response.status_code == status.HTTP_200_OK
        assert second_response.status_code == status.HTTP_200_OK
        assert today_response.status_code == status.HTTP_200_OK
        assert today_response.json()["water_ml"] == 500
        assert today_response.json()["steps"] == 1500
        assert today_response.json()["exercise_minutes"] == 30

    async def test_save_today_health_record_requires_auth(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/health-record/today",
                json={"water_ml": 100, "steps": 500, "exercise_minutes": 15},
            )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_save_today_health_record_rejects_invalid_slider_values(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            access_token = await self._issue_access_token(client, "health_record_invalid_slider@example.com")
            headers = {"Authorization": f"Bearer {access_token}"}

            response = await client.post(
                "/api/v1/health-record/today",
                json={"water_ml": 55, "steps": 50001, "exercise_minutes": 12},
                headers=headers,
            )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
