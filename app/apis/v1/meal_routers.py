from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import ORJSONResponse as Response

from app.core import config
from app.dependencies.security import get_request_user
from app.dtos.meals import (
    MealCreateRequest,
    MealCreateResponse,
    MealFromAnalysisRequest,
    MealFromAnalysisResponse,
    MealTodayResponse,
    MealTodayRowResponse,
    MealTodaySummaryResponse,
)
from app.models.predictions import Meal
from app.models.users import User

meal_router = APIRouter(prefix="/meals", tags=["meals"])


def _to_row(meal: Meal) -> MealTodayRowResponse:
    return MealTodayRowResponse(
        id=meal.id,
        menu_label=meal.label,
        kcal=meal.calories_est,
        carb_g=meal.carb_g,
        protein_g=meal.protein_g,
        fat_g=meal.fat_g,
        created_at=meal.created_at,
    )


def _carb_message(carb_pct: float, has_macro_data: bool) -> str:
    if not has_macro_data:
        return "오늘 저장된 식단 기록이 없습니다."
    if carb_pct > 65.0:
        return "오늘은 탄수화물 비중이 높게 기록됐어요. 내일은 단백질/식이섬유를 보강해 균형을 맞춰보세요."
    if carb_pct < 55.0:
        return "탄수화물 비중이 낮아요. 활동량에 따라 적절히 조절해보세요."
    return "오늘 탄수화물 비중은 권장 범위(55~65%) 안에 있어요."


async def _build_today_response(user_id: int) -> MealTodayResponse:
    now_kst = datetime.now(config.TIMEZONE)
    start = now_kst.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)

    meals = await Meal.filter(user_id=user_id, created_at__gte=start, created_at__lt=end).order_by("-created_at")

    total_kcal = 0
    total_carb_g = 0.0
    total_protein_g = 0.0
    total_fat_g = 0.0

    rows: list[MealTodayRowResponse] = []
    for meal in meals:
        rows.append(_to_row(meal))
        total_kcal += meal.calories_est or 0
        total_carb_g += float(meal.carb_g or 0.0)
        total_protein_g += float(meal.protein_g or 0.0)
        total_fat_g += float(meal.fat_g or 0.0)

    carb_kcal = total_carb_g * 4.0
    protein_kcal = total_protein_g * 4.0
    fat_kcal = total_fat_g * 9.0
    total_macro_kcal = carb_kcal + protein_kcal + fat_kcal
    carb_pct = round((carb_kcal / total_macro_kcal * 100.0), 1) if total_macro_kcal > 0 else 0.0

    summary = MealTodaySummaryResponse(
        total_kcal=total_kcal,
        total_carb_g=round(total_carb_g, 1),
        total_protein_g=round(total_protein_g, 1),
        total_fat_g=round(total_fat_g, 1),
    )
    return MealTodayResponse(
        rows=rows,
        summary=summary,
        carb_pct=carb_pct,
        message=_carb_message(carb_pct, has_macro_data=total_macro_kcal > 0),
    )


@meal_router.post("", response_model=MealCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_meal(req: MealCreateRequest) -> Response:
    meal = await Meal.create(
        user=None,  # 로그인 붙이면 user 연결
        label=req.label,
        calories_est=req.calories_est,
    )

    data = MealCreateResponse(
        id=meal.id,
        label=meal.label,
        calories_est=meal.calories_est or 0,
        created_at=meal.created_at,
    )
    return Response(data.model_dump(), status_code=status.HTTP_201_CREATED)


@meal_router.post("/from_analysis", response_model=MealFromAnalysisResponse, status_code=status.HTTP_201_CREATED)
async def create_meal_from_analysis(
    req: MealFromAnalysisRequest,
    user: Annotated[User, Depends(get_request_user)],
) -> Response:
    meal = await Meal.create(
        user_id=user.id,
        label=req.menu_label,
        calories_est=round(req.kcal),
        carb_g=round(req.carb_g, 1),
        protein_g=round(req.protein_g, 1),
        fat_g=round(req.fat_g, 1),
    )
    today = await _build_today_response(user.id)
    payload = MealFromAnalysisResponse(saved=_to_row(meal), today=today)
    return Response(payload.model_dump(), status_code=status.HTTP_201_CREATED)


@meal_router.get("/today", response_model=MealTodayResponse, status_code=status.HTTP_200_OK)
async def get_today_meals(
    user: Annotated[User, Depends(get_request_user)],
) -> Response:
    data = await _build_today_response(user.id)
    return Response(data.model_dump(), status_code=status.HTTP_200_OK)
