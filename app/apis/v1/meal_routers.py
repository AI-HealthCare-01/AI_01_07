from fastapi import APIRouter, status
from fastapi.responses import ORJSONResponse as Response

from app.dtos.meals import MealCreateRequest, MealCreateResponse
from app.models.predictions import Meal

meal_router = APIRouter(prefix="/meals", tags=["meals"])


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
