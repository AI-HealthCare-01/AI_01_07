import os
from typing import Annotated

import httpx
from fastapi import APIRouter, File, UploadFile, status
from fastapi.responses import ORJSONResponse as Response

from app.dtos.foods import FoodSaveRequest, FoodSaveResponse
from app.models.predictions import Meal

food_router = APIRouter(prefix="/food", tags=["food"])
AI_WORKER_URL = os.getenv("AI_WORKER_URL", "http://127.0.0.1:9000")


@food_router.post("/analyze", status_code=status.HTTP_200_OK)
async def analyze_food(file: Annotated[UploadFile, File(...)]) -> Response:
    async with httpx.AsyncClient(timeout=60.0) as client:
        files = {"file": (file.filename, await file.read(), file.content_type)}
        r = await client.post(f"{AI_WORKER_URL}/infer/food", files=files)
        r.raise_for_status()
        return Response(r.json(), status_code=status.HTTP_200_OK)


@food_router.post("/save", response_model=FoodSaveResponse, status_code=status.HTTP_201_CREATED)
async def save_food(req: FoodSaveRequest) -> Response:
    calories_est = round(req.kcal) if req.kcal is not None else None
    display_label = req.name_ko or req.label

    meal = await Meal.create(
        user=None,  # 로그인 연동 전 임시
        label=display_label,
        calories_est=calories_est,
    )

    data = FoodSaveResponse(
        id=meal.id,
        label=meal.label,
        calories_est=meal.calories_est,
        created_at=meal.created_at,
    )
    return Response(data.model_dump(), status_code=status.HTTP_201_CREATED)


@food_router.post("/reanalyze", status_code=status.HTTP_200_OK)
async def reanalyze_food(payload: dict) -> Response:
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(f"{AI_WORKER_URL}/infer/food/reanalyze", json=payload)
        r.raise_for_status()
        return Response(r.json(), status_code=status.HTTP_200_OK)
