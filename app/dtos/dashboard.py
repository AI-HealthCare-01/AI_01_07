from datetime import date

from pydantic import BaseModel

from app.dtos.base import BaseSerializerModel


class RiskCard(BaseModel):
    risk_level: str  # low/medium/borderline/high
    p_prediabetes: float
    p_diabetes: float
    top_factors: list[str]


class CaloriesCard(BaseModel):
    today_kcal: int
    goal_kcal: int
    remaining_kcal: int


class TrendPoint(BaseModel):
    date: date
    p_prediabetes: float
    kcal: int


class DashboardOverviewResponse(BaseSerializerModel):
    risk: RiskCard
    calories: CaloriesCard
    trend_7d: list[TrendPoint]
