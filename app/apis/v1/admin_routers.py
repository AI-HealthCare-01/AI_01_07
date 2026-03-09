from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import ORJSONResponse as Response

from app.dependencies.security import get_request_user
from app.dtos.users import AdminUserListItemResponse, AdminUserListResponse
from app.models.users import User
from app.repositories.user_repository import UserRepository

admin_router = APIRouter(prefix="/admin", tags=["admin"])


@admin_router.get("/users", response_model=AdminUserListResponse, status_code=status.HTTP_200_OK)
async def admin_list_users(
    request_user: Annotated[User, Depends(get_request_user)],
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
    q: str | None = None,
) -> Response:
    if not request_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다.")

    users, total = await UserRepository().list_users_paginated(page=page, size=size, query=q)
    data = AdminUserListResponse(
        page=page,
        size=size,
        total=total,
        items=[AdminUserListItemResponse.model_validate(user) for user in users],
    )
    return Response(content=data.model_dump(), status_code=status.HTTP_200_OK)

