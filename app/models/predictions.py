# app/models/predictions.py
from tortoise import fields, models

from app.models.users import User


class DiabetesPrediction(models.Model):
    id = fields.BigIntField(primary_key=True)

    # 아직 React에 로그인 연결 전이므로 null 허용 (나중에 auth 붙이면 user 필수로 바꿔도 됨)
    user: fields.ForeignKeyNullableRelation[User] = fields.ForeignKeyField(
        "models.User", related_name="diabetes_predictions", null=True, on_delete=fields.SET_NULL
    )

    age_group = fields.CharField(max_length=10)
    height_cm = fields.FloatField()
    weight_kg = fields.FloatField()
    bmi = fields.FloatField()

    p_prediabetes = fields.FloatField()
    p_diabetes = fields.FloatField()
    risk_level = fields.CharField(max_length=20)

    top_factors = fields.JSONField(default=list)

    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "diabetes_predictions"


class Meal(models.Model):
    id = fields.BigIntField(primary_key=True)

    user: fields.ForeignKeyNullableRelation[User] = fields.ForeignKeyField(
        "models.User", related_name="meals", null=True, on_delete=fields.SET_NULL
    )

    label = fields.CharField(max_length=80, null=True)  # 음식명(선택)
    calories_est = fields.IntField(null=True)  # 추정 칼로리(일단 하나만)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "meals"


class OnboardingSurvey(models.Model):
    id = fields.BigIntField(primary_key=True)

    user: fields.ForeignKeyNullableRelation[User] = fields.ForeignKeyField(
        "models.User", related_name="onboarding_surveys", null=True, on_delete=fields.SET_NULL
    )

    age = fields.IntField()
    gender = fields.CharField(max_length=10)
    height_cm = fields.FloatField()
    weight_kg = fields.FloatField()
    bmi = fields.FloatField()
    family_history = fields.CharField(max_length=10)
    hypertension = fields.BooleanField()
    hyperlipidemia = fields.BooleanField()
    smoking_status = fields.CharField(max_length=10)
    drinking_freq = fields.CharField(max_length=16)
    exercise_days_30m = fields.CharField(max_length=10)
    sugary_drink_freq = fields.CharField(max_length=10)
    late_night_meal_freq = fields.CharField(max_length=10)
    post_meal_walk = fields.CharField(max_length=10)

    risk_group = fields.IntField()
    risk_probability = fields.FloatField()
    risk_stage = fields.CharField(max_length=20)
    message = fields.CharField(max_length=255)
    recommended_actions = fields.JSONField(default=list)

    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "onboarding_surveys"
