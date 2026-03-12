from httpx import ASGITransport, AsyncClient
from starlette import status
from tortoise.contrib.test import TestCase

from app.main import app


class TestUserChallengeApi(TestCase):
    async def _signup_and_login(self, client: AsyncClient, email: str) -> str:
        await client.post(
            "/api/v1/auth/signup",
            json={
                "email": email,
                "password": "Password123!",
                "name": "체크챌린지",
                "gender": "FEMALE",
                "birth_date": "1992-02-02",
                "phone_number": "01033334444",
            },
        )
        login_response = await client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
        return login_response.json()["access_token"]

    async def test_get_templates_and_create_challenge(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            access_token = await self._signup_and_login(client, "user_challenge_create@example.com")
            headers = {"Authorization": f"Bearer {access_token}"}

            template_response = await client.get("/api/v1/challenges/templates", headers=headers)
            assert template_response.status_code == status.HTTP_200_OK
            templates = template_response.json()
            assert len(templates) >= 10

            create_response = await client.post(
                "/api/v1/challenges",
                json={"template_key": templates[0]["key"]},
                headers=headers,
            )
            assert create_response.status_code == status.HTTP_201_CREATED
            created = create_response.json()
            assert created["title"]
            assert created["today_done"] is False
            assert created["streak"] == 0

    async def test_list_and_check_user_challenge(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            access_token = await self._signup_and_login(client, "user_challenge_check@example.com")
            headers = {"Authorization": f"Bearer {access_token}"}

            create_response = await client.post(
                "/api/v1/challenges",
                json={"template_key": "walk_10"},
                headers=headers,
            )
            challenge_id = create_response.json()["id"]

            check_response = await client.post(
                f"/api/v1/challenges/{challenge_id}/check",
                json={"done": True},
                headers=headers,
            )
            assert check_response.status_code == status.HTTP_200_OK
            checked = check_response.json()
            assert checked["today_done"] is True
            assert checked["streak"] == 1

            list_response = await client.get("/api/v1/challenges", headers=headers)
            assert list_response.status_code == status.HTTP_200_OK
            items = list_response.json()
            assert len(items) == 1
            assert items[0]["template_key"] == "walk_10"
            assert items[0]["today_done"] is True
            assert items[0]["streak"] == 1

    async def test_duplicate_template_returns_conflict(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            access_token = await self._signup_and_login(client, "user_challenge_duplicate@example.com")
            headers = {"Authorization": f"Bearer {access_token}"}

            first = await client.post("/api/v1/challenges", json={"template_key": "extra_water"}, headers=headers)
            second = await client.post("/api/v1/challenges", json={"template_key": "extra_water"}, headers=headers)
            assert first.status_code == status.HTTP_201_CREATED
            assert second.status_code == status.HTTP_409_CONFLICT
