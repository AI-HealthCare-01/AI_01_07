from httpx import ASGITransport, AsyncClient
from starlette import status
from tortoise.contrib.test import TestCase

from app.main import app


class TestMealTodayApi(TestCase):
    async def _signup_and_login(self, client: AsyncClient, email: str) -> str:
        await client.post(
            "/api/v1/auth/signup",
            json={
                "email": email,
                "password": "Password123!",
                "name": "식단테스터",
                "gender": "FEMALE",
                "birth_date": "1993-01-01",
                "phone_number": "01099990000",
            },
        )
        login_response = await client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
        return login_response.json()["access_token"]

    async def test_create_meal_from_analysis_and_get_today(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            access_token = await self._signup_and_login(client, "meal_today@example.com")
            headers = {"Authorization": f"Bearer {access_token}"}

            create_response = await client.post(
                "/api/v1/meals/from_analysis",
                json={
                    "menu_label": "비빔밥",
                    "kcal": 620.5,
                    "carb_g": 90.2,
                    "protein_g": 22.8,
                    "fat_g": 14.1,
                },
                headers=headers,
            )
            assert create_response.status_code == status.HTTP_201_CREATED
            created = create_response.json()
            assert created["saved"]["menu_label"] == "비빔밥"
            assert created["saved"]["kcal"] == 620
            assert created["today"]["summary"]["total_carb_g"] == 90.2

            today_response = await client.get("/api/v1/meals/today", headers=headers)
            assert today_response.status_code == status.HTTP_200_OK
            today = today_response.json()
            assert len(today["rows"]) == 1
            assert today["rows"][0]["menu_label"] == "비빔밥"
            assert "carb_pct" in today
            assert "message" in today

    async def test_today_unauthorized(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/meals/today")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
