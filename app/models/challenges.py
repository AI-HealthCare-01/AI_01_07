from tortoise import fields, models


class ChallengeDaily(models.Model):
    id = fields.BigIntField(primary_key=True)
    user = fields.ForeignKeyField("models.User", related_name="challenge_dailies", on_delete=fields.CASCADE)
    date = fields.DateField()

    steps = fields.IntField(default=0)
    exercise_minutes = fields.IntField(default=0)
    water_cups = fields.IntField(default=0)
    sleep_hours = fields.FloatField(default=0)
    no_snack = fields.BooleanField(default=False)

    daily_score = fields.FloatField(default=0)
    tier = fields.CharField(max_length=24, default="needs_attention")
    behavior_index = fields.FloatField(default=0.5)
    delta = fields.FloatField(default=0)

    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "challenge_daily"
        unique_together = (("user_id", "date"),)
