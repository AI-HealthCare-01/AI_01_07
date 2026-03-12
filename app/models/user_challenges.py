from tortoise import fields, models


class UserChallenge(models.Model):
    id = fields.BigIntField(primary_key=True)
    user = fields.ForeignKeyField("models.User", related_name="user_challenges", on_delete=fields.CASCADE)
    template_key = fields.CharField(max_length=64)
    title = fields.CharField(max_length=64)
    description = fields.CharField(max_length=160)
    is_active = fields.BooleanField(default=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "user_challenge"
        unique_together = (("user_id", "template_key"),)


class UserChallengeLog(models.Model):
    id = fields.BigIntField(primary_key=True)
    user = fields.ForeignKeyField("models.User", related_name="user_challenge_logs", on_delete=fields.CASCADE)
    user_challenge = fields.ForeignKeyField("models.UserChallenge", related_name="logs", on_delete=fields.CASCADE)
    date = fields.DateField()
    done = fields.BooleanField(default=False)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "user_challenge_log"
        unique_together = (("user_challenge_id", "date"),)
