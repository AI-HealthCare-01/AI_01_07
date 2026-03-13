import logging
import os
from datetime import date, timedelta
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, status
from fastapi.responses import ORJSONResponse as Response

from app.dependencies.security import get_request_user
from app.dtos.onboarding import (
    LatestOnboardingProfileResponse,
    OnboardingPredictionResponse,
    OnboardingRiskTrendPoint,
    OnboardingSurveyRequest,
    RiskStage,
)
from app.models.predictions import OnboardingSurvey
from app.models.users import User
from app.services.notifications import NotificationService

AI_WORKER_URL = os.getenv("AI_WORKER_URL", "http://127.0.0.1:9000")

onboarding_router = APIRouter(prefix="/onboarding", tags=["onboarding"])
logger = logging.getLogger(__name__)


def to_model_features(req: OnboardingSurveyRequest) -> dict[str, int | float | str]:
    return {
        "age": req.age,
        "sex": 1 if req.gender == "male" else 2,
        "HE_ht": req.height_cm,
        "HE_wt": req.weight_kg,
        "BMI": req.bmi,
        "Family_History": 1 if req.family_history == "yes" else 0,
        "DI1_dg": 1 if req.hypertension == "yes" else 0,
        "DI2_dg": 1 if req.hyperlipidemia == "yes" else 0,
        "Smoke_Status": {"never": "Never", "former": "Past", "current": "Current"}[req.smoking_status],
        "BD1_11": {"rarely": 0.0, "week_1_2": 1.5, "week_3_plus": 4.0}[req.drinking_freq],
        "pa_aerobic": 0 if req.exercise_days_30m == "d0" else 1,
        "N_SUGAR": {"rarely": 0.0, "sometimes": 2.0, "often": 7.0}[req.sugary_drink_freq],
    }


def to_stage(prob: float) -> RiskStage:
    if prob >= 0.66:
        return RiskStage.HIGH
    if prob >= 0.33:
        return RiskStage.BORDERLINE
    return RiskStage.NORMAL


def build_actions(req: OnboardingSurveyRequest) -> list[str]:
    actions = []
    if req.late_night_meal_freq == "often":
        actions.append("야식 횟수를 주 1~2회 이하로 줄여보세요.")
    if req.post_meal_walk in {"sometimes", "never"}:
        actions.append("식후 10분 걷기를 하루 1회 이상 실천해보세요.")
    if req.sugary_drink_freq != "rarely":
        actions.append("당음료 대신 물 1컵으로 대체해보세요.")
    if req.exercise_days_30m in {"d0", "d1_2"}:
        actions.append("주 3일 이상 30분 운동을 목표로 해보세요.")
    return actions[:3] or ["현재 생활습관을 꾸준히 유지해보세요."]


def stage_message(stage: RiskStage) -> str:
    if stage == RiskStage.NORMAL:
        return "정상군으로 보입니다. 좋은 흐름을 유지해 주세요."
    if stage == RiskStage.BORDERLINE:
        return "경계군 가능성이 있습니다. 생활습관 개선과 정기 검진을 권장합니다."
    return "고위험군 가능성이 높습니다. 병원에서 정밀 진단을 권장합니다."


@onboarding_router.get("/latest", response_model=LatestOnboardingProfileResponse, status_code=status.HTTP_200_OK)
async def get_latest_onboarding_profile(user: Annotated[User, Depends(get_request_user)]) -> Response:
    latest = await OnboardingSurvey.filter(user=user).order_by("-created_at").first()
    if not latest:
        data = LatestOnboardingProfileResponse(has_onboarding=False, height_cm=None, weight_kg=None, bmi=None)
        return Response(data.model_dump(), status_code=status.HTTP_200_OK)

    data = LatestOnboardingProfileResponse(
        has_onboarding=True,
        height_cm=float(latest.height_cm),
        weight_kg=float(latest.weight_kg),
        bmi=float(latest.bmi),
    )
    return Response(data.model_dump(), status_code=status.HTTP_200_OK)


@onboarding_router.get("/risk-trend", response_model=list[OnboardingRiskTrendPoint], status_code=status.HTTP_200_OK)
async def get_onboarding_risk_trend(user: Annotated[User, Depends(get_request_user)]) -> Response:
    rows = await OnboardingSurvey.filter(user=user).order_by("created_at")
    if not rows:
        return Response([], status_code=status.HTTP_200_OK)

    risk_by_date: dict[date, float] = {}
    for row in rows:
        risk_by_date[row.created_at.date()] = float(row.risk_probability)

    start_date = rows[0].created_at.date()
    today = date.today()
    current_risk = float(risk_by_date.get(start_date, 0.0))
    points: list[OnboardingRiskTrendPoint] = []
    day_cursor = start_date
    while day_cursor <= today:
        if day_cursor in risk_by_date:
            current_risk = float(risk_by_date[day_cursor])
        points.append(OnboardingRiskTrendPoint(date=day_cursor.isoformat(), risk_probability=current_risk))
        day_cursor += timedelta(days=1)

    return Response([point.model_dump() for point in points], status_code=status.HTTP_200_OK)


@onboarding_router.post("", response_model=OnboardingPredictionResponse, status_code=status.HTTP_201_CREATED)
@onboarding_router.post("/run", response_model=OnboardingPredictionResponse, status_code=status.HTTP_201_CREATED)
async def submit_onboarding(req: OnboardingSurveyRequest, user: Annotated[User, Depends(get_request_user)]) -> Response:
    payload = to_model_features(req)

    risk_group = 0
    risk_probability = 0.0
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            worker_resp = await client.post(f"{AI_WORKER_URL}/infer/diabetes/binary", json=payload)
            worker_resp.raise_for_status()
            out = worker_resp.json()
            risk_group = int(out["risk_group"])
            risk_probability = float(out["risk_probability"])
    except Exception:
        # ai_worker unavailable fallback
        risk_probability = min(max((req.bmi - 20.0) * 0.03 + (0.12 if req.family_history == "yes" else 0.0), 0.0), 1.0)
        risk_group = 1 if risk_probability >= 0.5 else 0

    stage = to_stage(risk_probability)
    message = stage_message(stage)
    actions = build_actions(req)

    saved = await OnboardingSurvey.create(
        user=user,
        age=req.age,
        gender=req.gender,
        height_cm=req.height_cm,
        weight_kg=req.weight_kg,
        bmi=req.bmi,
        family_history=req.family_history,
        hypertension=req.hypertension == "yes",
        hyperlipidemia=req.hyperlipidemia == "yes",
        smoking_status=req.smoking_status,
        drinking_freq=req.drinking_freq,
        exercise_days_30m=req.exercise_days_30m,
        sugary_drink_freq=req.sugary_drink_freq,
        late_night_meal_freq=req.late_night_meal_freq,
        post_meal_walk=req.post_meal_walk,
        risk_group=risk_group,
        risk_probability=risk_probability,
        risk_stage=stage,
        message=message,
        recommended_actions=actions,
    )
    notification_service = NotificationService()
    try:
        await notification_service.create_notification(
            user=user,
            notification_type="ONBOARDING_COMPLETED",
            level="success",
            icon="✅",
            title="설문이 완료되었습니다.",
            body="개인 맞춤 위험도 분석 결과가 생성되었습니다.",
            dedupe_key=f"onboarding_completed:{user.id}:{saved.id}",
        )
        if stage == RiskStage.HIGH:
            await notification_service.create_notification(
                user=user,
                notification_type="RISK_HIGH_REALTIME",
                level="danger",
                icon="⚠️",
                title="고위험군으로 분류되었습니다.",
                body="병원에서 정밀 검진을 권장합니다.",
                dedupe_key=f"risk_high_realtime:{user.id}:{saved.id}",
            )
    except Exception:
        # Keep onboarding flow successful even when notification infra fails.
        logger.exception("Failed to create onboarding notifications for user_id=%s survey_id=%s", user.id, saved.id)

    data = OnboardingPredictionResponse(
        survey_id=saved.id,
        risk_group=risk_group,
        risk_probability=risk_probability,
        risk_stage=stage,
        message=message,
        recommended_actions=actions,
    )
    return Response(data.model_dump(), status_code=status.HTTP_201_CREATED)
