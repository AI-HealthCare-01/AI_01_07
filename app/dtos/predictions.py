# app/dtos/predictions.py
from app.dtos.base import BaseSerializerModel


class DiabetesRunRequest(BaseSerializerModel):
    age_group: str
    height_cm: float
    weight_kg: float
    exercise_days_30m: str = "3-4"
    sugary_drink_days: str = "1-2"


class DiabetesRunResponse(BaseSerializerModel):
    risk_level: str
    p_prediabetes: float
    p_diabetes: float
    top_factors: list[str]
