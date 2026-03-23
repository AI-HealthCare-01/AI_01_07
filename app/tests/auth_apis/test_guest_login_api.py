from datetime import date, datetime, timedelta

from httpx import ASGITransport, AsyncClient
from starlette import status
from tortoise.contrib.test import TestCase

from app.core import config
from app.main import app
from app.models.users import Gender, User
from app.services.jwt import JwtService
from app.utils.security import hash_password


class TestGuestLoginAPI(TestCase):
    async def test_guest_login_success(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/v1/auth/guest-login")

        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        assert "access_token" in payload
        assert payload["is_guest"] is True
        assert payload["name"].startswith("guest_")
        assert payload["email"].endswith("@g.ai")

    async def test_expired_guest_is_rejected_and_deleted(self):
        expired_guest = await User.create(
            email="gexpired@g.ai",
            hashed_password=hash_password("Guest!Password123"),
            name="guest_999999",
            gender=Gender.MALE,
            birthday=date(2000, 1, 1),
            phone_number="01012345678",
            is_guest=True,
            expires_at=datetime.now(config.TIMEZONE) - timedelta(minutes=1),
        )
        access_token = str(JwtService().issue_jwt_pair(expired_guest)["access_token"])

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {access_token}"})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert await User.get_or_none(id=expired_guest.id) is None
