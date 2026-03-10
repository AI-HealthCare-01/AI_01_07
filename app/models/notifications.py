from tortoise import fields, models

from app.models.users import User


class Notification(models.Model):
    id = fields.BigIntField(primary_key=True)
    user: fields.ForeignKeyRelation[User] = fields.ForeignKeyField(
        "models.User", related_name="notifications", on_delete=fields.CASCADE
    )
    type = fields.CharField(max_length=64)
    level = fields.CharField(max_length=16, default="info")
    icon = fields.CharField(max_length=16, null=True)
    title = fields.CharField(max_length=120)
    body = fields.CharField(max_length=255)
    is_read = fields.BooleanField(default=False)
    read_at = fields.DatetimeField(null=True)
    scheduled_for = fields.DatetimeField(null=True)
    sent_at = fields.DatetimeField(auto_now_add=True)
    dedupe_key = fields.CharField(max_length=190, unique=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "notifications"
