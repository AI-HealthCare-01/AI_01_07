from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import ORJSONResponse as Response

from app.dependencies.security import get_request_user
from app.dtos.notifications import NotificationItemResponse, NotificationListResponse, NotificationReadResponse
from app.models.users import User
from app.services.notifications import NotificationService

notification_router = APIRouter(prefix="/notifications", tags=["notifications"])


@notification_router.get("", response_model=NotificationListResponse, status_code=status.HTTP_200_OK)
async def list_notifications(
    user: Annotated[User, Depends(get_request_user)],
    service: Annotated[NotificationService, Depends(NotificationService)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> Response:
    unread_count, items = await service.list_user_notifications(user=user, limit=limit)
    payload = NotificationListResponse(
        unread_count=unread_count,
        items=[NotificationItemResponse.model_validate(item) for item in items],
    )
    return Response(payload.model_dump(), status_code=status.HTTP_200_OK)


@notification_router.patch("/{notification_id}/read", response_model=NotificationReadResponse, status_code=status.HTTP_200_OK)
async def mark_notification_read(
    notification_id: int,
    user: Annotated[User, Depends(get_request_user)],
    service: Annotated[NotificationService, Depends(NotificationService)],
) -> Response:
    await service.mark_read(user=user, notification_id=notification_id)
    unread_count, _ = await service.list_user_notifications(user=user, limit=1)
    payload = NotificationReadResponse(detail="알림 읽음 처리 완료", unread_count=unread_count)
    return Response(payload.model_dump(), status_code=status.HTTP_200_OK)


@notification_router.patch("/read-all", response_model=NotificationReadResponse, status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(
    user: Annotated[User, Depends(get_request_user)],
    service: Annotated[NotificationService, Depends(NotificationService)],
) -> Response:
    await service.mark_all_read(user=user)
    unread_count, _ = await service.list_user_notifications(user=user, limit=1)
    payload = NotificationReadResponse(detail="전체 알림 읽음 처리 완료", unread_count=unread_count)
    return Response(payload.model_dump(), status_code=status.HTTP_200_OK)
