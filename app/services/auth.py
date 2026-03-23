import secrets
from datetime import date, datetime, time, timedelta

from fastapi.exceptions import HTTPException
from pydantic import EmailStr
from starlette import status
from tortoise.transactions import in_transaction

from app.core import config
from app.dtos.auth import LoginRequest, SignUpRequest
from app.models.checkin import DailyHealthCheck
from app.models.predictions import DiabetesPrediction, Meal, OnboardingSurvey
from app.models.users import Gender, User
from app.repositories.user_repository import UserRepository
from app.services.jwt import JwtService
from app.utils.common import normalize_phone_number
from app.utils.jwt.tokens import AccessToken, RefreshToken
from app.utils.security import hash_password, verify_password


class AuthService:
    def __init__(self):
        self.user_repo = UserRepository()
        self.jwt_service = JwtService()

    async def signup(self, data: SignUpRequest) -> User:
        # 이메일 중복 체크
        await self.check_email_exists(data.email)

        # 입력받은 휴대폰 번호를 노말라이즈
        normalized_phone_number = normalize_phone_number(data.phone_number)

        # 휴대폰 번호 중복 체크
        await self.check_phone_number_exists(normalized_phone_number)

        # 유저 생성
        async with in_transaction():
            user = await self.user_repo.create_user(
                email=data.email,
                hashed_password=hash_password(data.password),  # 해시화된 비밀번호를 사용
                name=data.name,
                phone_number=normalized_phone_number,
                gender=data.gender,
                birthday=data.birth_date,
            )

            return user

    async def authenticate(self, data: LoginRequest) -> User:
        # 이메일로 사용자 조회
        email = str(data.email)
        user = await self.user_repo.get_user_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="이메일 또는 비밀번호가 올바르지 않습니다."
            )

        # 비밀번호 검증
        if not verify_password(data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="이메일 또는 비밀번호가 올바르지 않습니다."
            )

        # 활성 사용자 체크
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="비활성화된 계정입니다.")

        return user

    async def login(self, user: User) -> dict[str, AccessToken | RefreshToken]:
        await self.user_repo.update_last_login(user.id)
        return self.jwt_service.issue_jwt_pair(user)

    async def create_guest_user(self) -> User:
        phone_number = await self._generate_unique_dummy_phone_number()
        guest_token = secrets.token_hex(4)
        expires_at = self._guest_expiration()
        random_password = f"Guest!{secrets.token_urlsafe(12)}"

        async with in_transaction():
            user = await self.user_repo.create_user(
                email=f"g{guest_token}@g.ai",
                hashed_password=hash_password(random_password),
                name="guest_pending",
                phone_number=phone_number,
                gender=Gender.MALE,
                birthday=date(2000, 1, 1),
                is_guest=True,
                expires_at=expires_at,
            )
            user.name = f"guest_{user.id}"
            user.updated_at = datetime.now(config.TIMEZONE)
            await user.save(update_fields=["name", "updated_at"])
            return user

    async def cleanup_guest_user(self, user: User) -> None:
        if not user.is_guest:
            return

        async with in_transaction():
            await DailyHealthCheck.filter(user=user).delete()
            await OnboardingSurvey.filter(user=user).delete()
            await DiabetesPrediction.filter(user=user).delete()
            await Meal.filter(user=user).delete()
            await user.delete()

    async def check_email_exists(self, email: str | EmailStr) -> None:
        if await self.user_repo.exists_by_email(email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용중인 이메일입니다.")

    async def check_phone_number_exists(self, phone_number: str) -> None:
        if await self.user_repo.exists_by_phone_number(phone_number):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용중인 휴대폰 번호입니다.")

    async def login_or_signup_google(self, *, email: str, name: str | None = None) -> User:
        user = await self.user_repo.get_user_by_email(email)
        if user:
            return user

        default_name = (name or email.split("@")[0] or "google_user")[:20]
        phone_number = await self._generate_unique_dummy_phone_number()
        random_password = f"Google!{secrets.token_urlsafe(12)}"

        async with in_transaction():
            return await self.user_repo.create_user(
                email=email,
                hashed_password=hash_password(random_password),
                name=default_name,
                phone_number=phone_number,
                gender=Gender.MALE,
                birthday=date(2000, 1, 1),
            )

    async def _generate_unique_dummy_phone_number(self) -> str:
        while True:
            candidate = f"010{secrets.randbelow(100_000_000):08d}"
            if not await self.user_repo.exists_by_phone_number(candidate):
                return candidate

    def _guest_expiration(self) -> datetime:
        now = datetime.now(config.TIMEZONE)
        tomorrow = now.date() + timedelta(days=1)
        return datetime.combine(tomorrow, time.min, tzinfo=config.TIMEZONE)
