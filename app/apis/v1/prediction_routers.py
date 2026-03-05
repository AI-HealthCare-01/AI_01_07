# app/apis/v1/prediction_routers.py
import math
import os
import httpx

from fastapi import APIRouter, status
from fastapi.responses import ORJSONResponse as Response

from app.dtos.predictions import DiabetesRunRequest, DiabetesRunResponse
from app.models.predictions import DiabetesPrediction

AI_WORKER_URL = os.getenv("AI_WORKER_URL", "http://127.0.0.1:9000")

prediction_router = APIRouter(prefix="/predictions", tags=["predictions"])


def sigmoid(x: float) -> float:
    return 1 / (1 + math.exp(-x))


@prediction_router.post("/diabetes/run", response_model=DiabetesRunResponse, status_code=status.HTTP_201_CREATED)
async def run_diabetes(req: DiabetesRunRequest) -> Response:
    # ✅ 규칙 기반(임시) 예측: 나중에 ai_worker 모델로 교체할 자리
    # run_diabetes 함수 안에서, 예측 계산부를 아래로 교체완료

    h = req.height_cm / 100.0
    bmi = req.weight_kg / (h * h + 1e-9)

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.post(
                f"{AI_WORKER_URL}/infer/diabetes",
                json={
                    "age_group": req.age_group,
                    "height_cm": req.height_cm,
                    "weight_kg": req.weight_kg,
                    "exercise_days_30m": req.exercise_days_30m,
                    "sugary_drink_days": req.sugary_drink_days,
                },
            )
            r.raise_for_status()
            out = r.json()

        level = out["risk_level"]
        p_pre = float(out["p_prediabetes"])
        p_dm = float(out["p_diabetes"])
        top_factors = list(out.get("top_factors", []))

    except Exception as e:
        # ✅ ai_worker 죽어도 서비스가 안 죽게: 기존 규칙기반 fallback
        h = req.height_cm / 100.0
        bmi = req.weight_kg / (h * h + 1e-9)

        age_factor = {"20-29": 0.0, "30-39": 0.1, "40-49": 0.2, "50-59": 0.3, "60+": 0.4}.get(req.age_group, 0.15)
        ex_factor = {"0": 0.2, "1-2": 0.1, "3-4": 0.0, "5-7": -0.05}.get(req.exercise_days_30m, 0.0)
        sugar_factor = {"0": -0.05, "1-2": 0.0, "3-4": 0.1, "5-7": 0.2}.get(req.sugary_drink_days, 0.0)

        logit_pre = -1.0 + 0.18 * (bmi - 23) + age_factor + ex_factor + sugar_factor
        p_pre = float(sigmoid(logit_pre))

        logit_dm = logit_pre - 1.2
        p_dm = float(sigmoid(logit_dm)) * 0.9

        if p_dm >= 0.70:
            level = "high"
        elif p_pre >= 0.40 and p_dm < 0.70:
            level = "borderline"
        elif p_pre >= 0.25:
            level = "medium"
        else:
            level = "low"

        top_factors = ["fallback_ai_worker"]

    # ✅ DB 저장 (user 연결은 나중 단계)
    await DiabetesPrediction.create(
        user=None,
        age_group=req.age_group,
        height_cm=req.height_cm,
        weight_kg=req.weight_kg,
        bmi=bmi,
        p_prediabetes=p_pre,
        p_diabetes=p_dm,
        risk_level=level,
        top_factors=top_factors,
    )

    data = DiabetesRunResponse(
        risk_level=level,
        p_prediabetes=p_pre,
        p_diabetes=p_dm,
        top_factors=top_factors,
    )
    return Response(data.model_dump(), status_code=status.HTTP_201_CREATED)