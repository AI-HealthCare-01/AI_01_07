from datetime import date, timedelta, datetime, time
from collections import defaultdict

from fastapi import APIRouter, status
from fastapi.responses import ORJSONResponse as Response

from app.dtos.dashboard import DashboardOverviewResponse, RiskCard, CaloriesCard, TrendPoint
from app.models.predictions import DiabetesPrediction, Meal

dashboard_router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@dashboard_router.get("/overview", response_model=DashboardOverviewResponse, status_code=status.HTTP_200_OK)
async def overview() -> Response:
    today = date.today()
    start_date = today - timedelta(days=6)

    start_dt = datetime.combine(start_date, time.min)
    end_dt = datetime.combine(today + timedelta(days=1), time.min)

    preds = await DiabetesPrediction.filter(created_at__gte=start_dt, created_at__lt=end_dt).order_by("created_at")
    meals = await Meal.filter(created_at__gte=start_dt, created_at__lt=end_dt)

    # ✅ 데이터 없으면 기존 mock 유지
    if not preds and not meals:
        trend = []
        for i in range(7):
            d = today - timedelta(days=6 - i)
            trend.append(TrendPoint(date=d, p_prediabetes=0.35 + i * 0.02, kcal=1700 - i * 50))

        data = DashboardOverviewResponse(
            risk=RiskCard(
                risk_level="borderline",
                p_prediabetes=0.52,
                p_diabetes=0.18,
                top_factors=["bmi", "exercise_days_30m", "sugary_drink_days"],
            ),
            calories=CaloriesCard(today_kcal=1450, goal_kcal=2000, remaining_kcal=550),
            trend_7d=trend,
        )
        return Response(data.model_dump(), status_code=status.HTTP_200_OK)

    # 날짜별 마지막 예측(그 날짜 마지막 레코드로 덮어쓰기)
    pred_by_date = {}
    for p in preds:
        pred_by_date[p.created_at.date()] = p

    # 날짜별 칼로리 합(현재 Meal 저장 안 하면 0일 수 있음)
    kcal_by_date = defaultdict(int)
    for m in meals:
        if m.calories_est is not None:
            kcal_by_date[m.created_at.date()] += int(m.calories_est)

    trend = []
    for i in range(7):
        d = start_date + timedelta(days=i)
        p = pred_by_date.get(d)
        trend.append(
            TrendPoint(
                date=d,
                p_prediabetes=float(p.p_prediabetes) if p else 0.0,
                kcal=int(kcal_by_date.get(d, 0)),
            )
        )

    latest = preds[-1] if preds else None
    risk = RiskCard(
        risk_level=latest.risk_level if latest else "low",
        p_prediabetes=float(latest.p_prediabetes) if latest else 0.0,
        p_diabetes=float(latest.p_diabetes) if latest else 0.0,
        top_factors=list(latest.top_factors) if latest else [],
    )

    goal = 2000
    today_kcal = int(kcal_by_date.get(today, 0))
    calories = CaloriesCard(today_kcal=today_kcal, goal_kcal=goal, remaining_kcal=max(goal - today_kcal, 0))

    data = DashboardOverviewResponse(risk=risk, calories=calories, trend_7d=trend)
    return Response(data.model_dump(), status_code=status.HTTP_200_OK)