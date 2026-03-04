from tortoise import fields, models


class DailyHealthCheck(models.Model):
    id = fields.BigIntField(primary_key=True)
    user = fields.ForeignKeyField("models.User", related_name="daily_health_checks", on_delete=fields.CASCADE)
    record_date = fields.DateField()
    water_ml = fields.IntField(default=0)
    steps = fields.IntField(default=0)
    exercise_minutes = fields.IntField(default=0)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "daily_health_checks"
        unique_together = (("user_id", "record_date"),)
