from datetime import datetime

from app.dtos.base import BaseSerializerModel


class NotificationItemResponse(BaseSerializerModel):
    id: int
    type: str
    level: str
    icon: str | None
    title: str
    body: str
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseSerializerModel):
    unread_count: int
    items: list[NotificationItemResponse]


class NotificationReadResponse(BaseSerializerModel):
    detail: str
    unread_count: int
