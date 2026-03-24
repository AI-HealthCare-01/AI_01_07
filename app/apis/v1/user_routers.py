from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import ORJSONResponse as Response

from app.dependencies.security import get_request_user
from app.dtos.users import (
    UserInfoResponse,
    UserPasswordChangeRequest,
    UserPasswordVerifyRequest,
    UserProfileOverviewResponse,
    UserUpdateRequest,
)
from app.models.users import User
from app.services.users import UserManageService

user_router = APIRouter(prefix="/users", tags=["users"])


@user_router.get("/me", response_model=UserInfoResponse, status_code=status.HTTP_200_OK)
async def user_me_info(
    user: Annotated[User, Depends(get_request_user)],
) -> Response:
    return Response(UserInfoResponse.model_validate(user).model_dump(), status_code=status.HTTP_200_OK)


@user_router.patch("/me", response_model=UserInfoResponse, status_code=status.HTTP_200_OK)
async def update_user_me_info(
    update_data: UserUpdateRequest,
    user: Annotated[User, Depends(get_request_user)],
    user_manage_service: Annotated[UserManageService, Depends(UserManageService)],
) -> Response:
    updated_user = await user_manage_service.update_user(user=user, data=update_data)
    return Response(UserInfoResponse.model_validate(updated_user).model_dump(), status_code=status.HTTP_200_OK)


@user_router.patch("/me/password", status_code=status.HTTP_200_OK)
async def change_user_me_password(
    request: UserPasswordChangeRequest,
    user: Annotated[User, Depends(get_request_user)],
    user_manage_service: Annotated[UserManageService, Depends(UserManageService)],
) -> Response:
    await user_manage_service.change_password(user=user, data=request)
    return Response(content={"detail": "비밀번호가 변경되었습니다."}, status_code=status.HTTP_200_OK)


@user_router.post("/me/password/verify", status_code=status.HTTP_200_OK)
async def verify_user_me_password(
    request: UserPasswordVerifyRequest,
    user: Annotated[User, Depends(get_request_user)],
    user_manage_service: Annotated[UserManageService, Depends(UserManageService)],
) -> Response:
    await user_manage_service.verify_password(user=user, data=request)
    return Response(content={"detail": "현재 비밀번호가 확인되었습니다."}, status_code=status.HTTP_200_OK)


@user_router.get("/me/profile-overview", response_model=UserProfileOverviewResponse, status_code=status.HTTP_200_OK)
async def get_user_me_profile_overview(
    user: Annotated[User, Depends(get_request_user)],
    user_manage_service: Annotated[UserManageService, Depends(UserManageService)],
) -> Response:
    data = await user_manage_service.get_profile_overview(user=user)
    return Response(content=data.model_dump(), status_code=status.HTTP_200_OK)


@user_router.delete("/me", status_code=status.HTTP_200_OK)
async def delete_user_me(
    user: Annotated[User, Depends(get_request_user)],
    user_manage_service: Annotated[UserManageService, Depends(UserManageService)],
) -> Response:
    await user_manage_service.delete_user(user=user)
    return Response(content={"detail": "회원탈퇴가 완료되었습니다."}, status_code=status.HTTP_200_OK)
