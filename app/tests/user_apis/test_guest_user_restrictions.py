from httpx import ASGITransport, AsyncClient
from starlette import status
from tortoise.contrib.test import TestCase

from app.main import app


class TestGuestUserRestrictions(TestCase):
    async def test_guest_cannot_update_profile(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            login_response = await client.post("/api/v1/auth/guest-login")
            access_token = login_response.json()["access_token"]
            response = await client.patch(
                "/api/v1/users/me",
                json={"name": "새닉네임"},
                headers={"Authorization": f"Bearer {access_token}"},
            )

        assert response.status_code == status.HTTP_403_FORBIDDEN
