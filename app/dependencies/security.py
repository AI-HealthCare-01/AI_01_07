from datetime import datetime
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core import config
from app.models.users import User
from app.repositories.user_repository import UserRepository
from app.services.auth import AuthService
from app.services.jwt import JwtService

security = HTTPBearer()


async def get_request_user(credential: Annotated[HTTPAuthorizationCredentials, Depends(security)]) -> User:
    token = credential.credentials
    verified = JwtService().verify_jwt(token=token, token_type="access")
    user_id = verified.payload["user_id"]
    user = await UserRepository().get_user(user_id)
    if not user:
        raise HTTPException(detail="Authenticate Failed.", status_code=status.HTTP_401_UNAUTHORIZED)
    if user.is_guest and user.expires_at and user.expires_at <= datetime.now(config.TIMEZONE):
        await AuthService().cleanup_guest_user(user)
        raise HTTPException(
            detail="게스트 체험 시간이 만료되었습니다. 다시 로그인해 주세요.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    return user
