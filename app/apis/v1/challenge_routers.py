from datetime import date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import ORJSONResponse as Response

from app.core import config
from app.dependencies.security import get_request_user
from app.dtos.challenges import (
    ChallengeDailyResponse,
    ChallengeDailyRowResponse,
    ChallengeDailySummaryResponse,
    ChallengeDailyUpsertRequest,
    ChallengeTrendPointResponse,
)
from app.models.challenges import ChallengeDaily
from app.models.users import User

challenge_router = APIRouter(prefix="/challenges", tags=["challenges"])

DEFAULT_BEHAVIOR_INDEX = 0.5


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


def _round_score(value: float) -> float:
    return round(value, 1)


def _round_delta(value: float) -> float:
    return round(value, 3)


def _compute_daily_score(payload: ChallengeDailyUpsertRequest) -> float:
    score_ex = min(payload.exercise_minutes, 60) * 2.0 if payload.exercise_minutes >= 10 else 0.0
    score_steps = (min(payload.steps, 10000) / 100.0 * 1.5) if payload.steps >= 3000 else 0.0
    score_water = float(min(payload.water_cups, 10)) if payload.water_cups >= 2 else 0.0

    daily_score = score_ex + score_steps + score_water
    if payload.no_snack:
        daily_score *= 1.10
    if 7 <= payload.sleep_hours <= 8:
        daily_score *= 1.10
    return _round_score(daily_score)


def _tier_for_score(daily_score: float) -> str:
    if daily_score >= 120:
        return "success"
    if daily_score >= 70:
        return "ok"
    return "needs_attention"


def _summary_message(tier: str, payload: ChallengeDailyRowResponse) -> tuple[str, list[str]]:
    if tier == "success":
        return (
            "좋은 흐름입니다. 오늘의 실천이 생활습관/당뇨 위험 지수(행동 지표)를 안정적으로 관리하는 데 도움이 됩니다. 다음으로는 수면 리듬을 그대로 유지해보세요.",
            ["움직임 충분", "좋은 수분 습관", "리듬 유지"],
        )
    if tier == "ok":
        return (
            "좋은 출발입니다. 오늘은 한 가지 행동만 더 보완해보세요. 예를 들어 물 2컵을 더 챙기거나 10분 정도 더 걷는 방식이면 충분합니다.",
            ["한 가지 더", "짧은 추가 걷기", "물 2컵 보완"],
        )

    tags = ["기록 시작", "짧은 걷기", "물 2컵"]
    if payload.no_snack:
        tags[0] = "야식 관리 유지"
    return (
        "나약한 인간... 오늘 기록은 아직 낮은 편입니다. 다만 한 번에 많이 바꾸기보다 10분 걷기나 물 2컵부터 시작해도 생활습관/당뇨 위험 지수(행동 지표) 관리에 충분한 첫걸음이 됩니다.",
        tags,
    )


async def _previous_behavior_index(user_id: int, target_date: date) -> float:
    prev_row = await ChallengeDaily.filter(user_id=user_id, date__lt=target_date).order_by("-date", "-id").first()
    return float(prev_row.behavior_index) if prev_row is not None else DEFAULT_BEHAVIOR_INDEX


def _build_row_response(
    row: ChallengeDaily | None, target_date: date, fallback_index: float
) -> ChallengeDailyRowResponse:
    if row is None:
        return ChallengeDailyRowResponse(
            id=None,
            date=target_date,
            steps=0,
            exercise_minutes=0,
            water_cups=0,
            sleep_hours=0,
            no_snack=False,
            daily_score=0.0,
            tier="needs_attention",
            behavior_index=round(fallback_index, 3),
            delta=0.0,
            created_at=None,
            updated_at=None,
        )

    return ChallengeDailyRowResponse(
        id=row.id,
        date=row.date,
        steps=row.steps,
        exercise_minutes=row.exercise_minutes,
        water_cups=row.water_cups,
        sleep_hours=float(row.sleep_hours),
        no_snack=row.no_snack,
        daily_score=float(row.daily_score),
        tier=row.tier,
        behavior_index=float(row.behavior_index),
        delta=float(row.delta),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _build_summary(row: ChallengeDailyRowResponse) -> ChallengeDailySummaryResponse:
    message, tags = _summary_message(row.tier, row)
    return ChallengeDailySummaryResponse(
        daily_score=row.daily_score,
        tier=row.tier,
        behavior_index=row.behavior_index,
        delta=row.delta,
        message=message,
        tags=tags,
    )


async def _build_today_response(user_id: int) -> ChallengeDailyResponse:
    today = datetime.now(config.TIMEZONE).date()
    row = await ChallengeDaily.get_or_none(user_id=user_id, date=today)
    fallback_index = await _previous_behavior_index(user_id, today)
    row_data = _build_row_response(row, today, fallback_index)
    return ChallengeDailyResponse(row=row_data, summary=_build_summary(row_data))


@challenge_router.post("/daily", response_model=ChallengeDailyResponse, status_code=status.HTTP_200_OK)
async def upsert_daily_challenge(
    req: ChallengeDailyUpsertRequest,
    user: Annotated[User, Depends(get_request_user)],
) -> Response:
    today = datetime.now(config.TIMEZONE).date()
    prev_index = await _previous_behavior_index(user.id, today)

    daily_score = _compute_daily_score(req)
    tier = _tier_for_score(daily_score)
    delta = _round_delta(_clamp((daily_score - 100.0) / 1000.0, -0.03, 0.03))
    behavior_index = round(_clamp(prev_index - delta, 0.0, 1.0), 3)

    row, _ = await ChallengeDaily.update_or_create(
        defaults={
            "steps": req.steps,
            "exercise_minutes": req.exercise_minutes,
            "water_cups": req.water_cups,
            "sleep_hours": req.sleep_hours,
            "no_snack": req.no_snack,
            "daily_score": daily_score,
            "tier": tier,
            "behavior_index": behavior_index,
            "delta": delta,
        },
        user_id=user.id,
        date=today,
    )

    row_data = _build_row_response(row, today, prev_index)
    data = ChallengeDailyResponse(row=row_data, summary=_build_summary(row_data))
    return Response(data.model_dump(), status_code=status.HTTP_200_OK)


@challenge_router.get("/today", response_model=ChallengeDailyResponse, status_code=status.HTTP_200_OK)
async def get_today_challenge(
    user: Annotated[User, Depends(get_request_user)],
) -> Response:
    data = await _build_today_response(user.id)
    return Response(data.model_dump(), status_code=status.HTTP_200_OK)


@challenge_router.get("/trend", response_model=list[ChallengeTrendPointResponse], status_code=status.HTTP_200_OK)
async def get_challenge_trend(
    user: Annotated[User, Depends(get_request_user)],
    days: Annotated[int, Query(ge=1, le=30)] = 7,
) -> Response:
    today = datetime.now(config.TIMEZONE).date()
    start_date = today - timedelta(days=days - 1)
    rows = await ChallengeDaily.filter(user_id=user.id, date__gte=start_date, date__lte=today).order_by("date")
    row_map = {row.date: row for row in rows}

    points: list[ChallengeTrendPointResponse] = []
    running_index = await _previous_behavior_index(user.id, start_date)
    for offset in range(days):
        point_date = start_date + timedelta(days=offset)
        row = row_map.get(point_date)
        if row is None:
            points.append(
                ChallengeTrendPointResponse(
                    date=point_date,
                    daily_score=0.0,
                    behavior_index=round(running_index, 3),
                    tier="needs_attention",
                )
            )
            continue

        running_index = float(row.behavior_index)
        points.append(
            ChallengeTrendPointResponse(
                date=row.date,
                daily_score=float(row.daily_score),
                behavior_index=running_index,
                tier=row.tier,
            )
        )

    return Response([item.model_dump() for item in points], status_code=status.HTTP_200_OK)
