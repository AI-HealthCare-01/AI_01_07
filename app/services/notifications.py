from datetime import datetime

from tortoise.exceptions import IntegrityError

from app.core import config
from app.models.notifications import Notification
from app.models.users import User


class NotificationService:
    async def create_notification(
        self,
        *,
        user: User,
        notification_type: str,
        title: str,
        body: str,
        dedupe_key: str,
        level: str = "info",
        icon: str | None = None,
        scheduled_for: datetime | None = None,
    ) -> Notification | None:
        try:
            return await Notification.create(
                user=user,
                type=notification_type,
                level=level,
                icon=icon,
                title=title,
                body=body,
                scheduled_for=scheduled_for,
                dedupe_key=dedupe_key,
            )
        except IntegrityError:
            return None

    async def list_user_notifications(self, *, user: User, limit: int = 50) -> tuple[int, list[Notification]]:
        capped_limit = max(1, min(limit, 200))
        unread_count = await Notification.filter(user=user, is_read=False).count()
        items = await Notification.filter(user=user).order_by("-created_at").limit(capped_limit)
        return unread_count, items

    async def mark_read(self, *, user: User, notification_id: int) -> bool:
        target = await Notification.get_or_none(id=notification_id, user=user)
        if not target:
            return False
        if not target.is_read:
            target.is_read = True
            target.read_at = datetime.now(config.TIMEZONE)
            await target.save(update_fields=["is_read", "read_at", "updated_at"])
        return True

    async def mark_all_read(self, *, user: User) -> int:
        now = datetime.now(config.TIMEZONE)
        updated_count = await Notification.filter(user=user, is_read=False).update(is_read=True, read_at=now)
        return int(updated_count)
