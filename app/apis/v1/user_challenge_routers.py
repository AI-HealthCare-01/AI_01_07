from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import ORJSONResponse as Response

from app.core import config
from app.dependencies.security import get_request_user
from app.dtos.user_challenges import (
    ChallengeTemplateResponse,
    UserChallengeCheckRequest,
    UserChallengeCheckResponse,
    UserChallengeCreateRequest,
    UserChallengeItemResponse,
)
from app.models.user_challenges import UserChallenge, UserChallengeLog
from app.models.users import User

user_challenge_router = APIRouter(prefix="/challenges", tags=["user-challenges"])

CHALLENGE_TEMPLATES = [
    {
        "key": "no_late_snack",
        "icon": "🌙",
        "title": "야식 안 먹기",
        "description": "오늘 야식 없이 마무리",
        "reminder_hint": "추천 알림 20:30",
    },
    {
        "key": "extra_water",
        "icon": "💧",
        "title": "물 2잔 더",
        "description": "커피 대신 물 한 잔",
        "reminder_hint": "추천 알림 15:00",
    },
    {
        "key": "veggie_plate",
        "icon": "🥗",
        "title": "채소 1접시",
        "description": "한 끼에 채소 추가",
        "reminder_hint": "추천 알림 11:30",
    },
    {
        "key": "stretch_10",
        "icon": "🧘",
        "title": "10분 스트레칭",
        "description": "잠깐 몸 풀기",
        "reminder_hint": "추천 알림 17:30",
    },
    {
        "key": "walk_10",
        "icon": "🚶",
        "title": "10분 산책",
        "description": "집 앞 한 바퀴",
        "reminder_hint": "추천 알림 18:30",
    },
    {
        "key": "take_stairs",
        "icon": "🪜",
        "title": "계단 이용",
        "description": "엘리베이터 대신 계단",
        "reminder_hint": "추천 알림 08:30",
    },
    {
        "key": "add_protein",
        "icon": "🥚",
        "title": "단백질 1가지 추가",
        "description": "계란/두부/요거트 등",
        "reminder_hint": "추천 알림 12:00",
    },
    {
        "key": "skip_sugary_drink",
        "icon": "🥤",
        "title": "당음료 피하기",
        "description": "탄산/달달한 음료 대신 물",
        "reminder_hint": "추천 알림 14:00",
    },
    {
        "key": "screen_off_before_sleep",
        "icon": "📵",
        "title": "화면 줄이기(취침 전)",
        "description": "잠들기 30분 전 폰 내려놓기",
        "reminder_hint": "추천 알림 22:00",
    },
    {
        "key": "no_snack_after_8",
        "icon": "🍽️",
        "title": "저녁 8시 이후 간식 금지",
        "description": "야식 유혹 컷",
        "reminder_hint": "추천 알림 19:50",
    },
]
TEMPLATE_MAP = {item["key"]: item for item in CHALLENGE_TEMPLATES}


async def _compute_streak(user_challenge_id: int, today_done: bool, today) -> int:
    if not today_done:
        return 0

    start_date = today - timedelta(days=13)
    logs = await UserChallengeLog.filter(
        user_challenge_id=user_challenge_id,
        date__gte=start_date,
        date__lte=today,
        done=True,
    ).order_by("-date")
    log_dates = {log.date for log in logs}

    streak = 0
    cursor = today
    for _ in range(14):
        if cursor not in log_dates:
            break
        streak += 1
        cursor -= timedelta(days=1)
    return streak


async def _serialize_user_challenge(item: UserChallenge, today) -> UserChallengeItemResponse:
    today_log = await UserChallengeLog.get_or_none(user_challenge_id=item.id, date=today)
    today_done = bool(today_log.done) if today_log is not None else False
    streak = await _compute_streak(item.id, today_done, today)
    return UserChallengeItemResponse(
        id=item.id,
        template_key=item.template_key,
        title=item.title,
        description=item.description,
        is_active=item.is_active,
        today_done=today_done,
        streak=streak,
        created_at=item.created_at,
    )


@user_challenge_router.get("/templates", response_model=list[ChallengeTemplateResponse], status_code=status.HTTP_200_OK)
async def get_challenge_templates(
    user: Annotated[User, Depends(get_request_user)],
) -> Response:
    _ = user
    payload = [ChallengeTemplateResponse(**item) for item in CHALLENGE_TEMPLATES]
    return Response([item.model_dump() for item in payload], status_code=status.HTTP_200_OK)


@user_challenge_router.post("", response_model=UserChallengeItemResponse, status_code=status.HTTP_201_CREATED)
async def create_user_challenge(
    req: UserChallengeCreateRequest,
    user: Annotated[User, Depends(get_request_user)],
) -> Response:
    template = TEMPLATE_MAP.get(req.template_key)
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="challenge template not found")

    existing = await UserChallenge.get_or_none(user_id=user.id, template_key=req.template_key)
    if existing is not None:
        if existing.is_active:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="challenge already added")
        existing.title = template["title"]
        existing.description = template["description"]
        existing.is_active = True
        await existing.save()
        created = existing
    else:
        created = await UserChallenge.create(
            user_id=user.id,
            template_key=req.template_key,
            title=template["title"],
            description=template["description"],
            is_active=True,
        )

    today = datetime.now(config.TIMEZONE).date()
    payload = await _serialize_user_challenge(created, today)
    return Response(payload.model_dump(), status_code=status.HTTP_201_CREATED)


@user_challenge_router.get("", response_model=list[UserChallengeItemResponse], status_code=status.HTTP_200_OK)
async def get_user_challenges(
    user: Annotated[User, Depends(get_request_user)],
) -> Response:
    today = datetime.now(config.TIMEZONE).date()
    items = await UserChallenge.filter(user_id=user.id, is_active=True).order_by("-created_at")
    payload = [await _serialize_user_challenge(item, today) for item in items]
    return Response([item.model_dump() for item in payload], status_code=status.HTTP_200_OK)


@user_challenge_router.post(
    "/{challenge_id}/check", response_model=UserChallengeCheckResponse, status_code=status.HTTP_200_OK
)
async def check_user_challenge(
    challenge_id: int,
    req: UserChallengeCheckRequest,
    user: Annotated[User, Depends(get_request_user)],
) -> Response:
    item = await UserChallenge.get_or_none(id=challenge_id, user_id=user.id, is_active=True)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="challenge not found")

    today = datetime.now(config.TIMEZONE).date()
    await UserChallengeLog.update_or_create(
        defaults={"done": req.done},
        user_id=user.id,
        user_challenge_id=item.id,
        date=today,
    )
    streak = await _compute_streak(item.id, req.done, today)
    payload = UserChallengeCheckResponse(id=item.id, today_done=req.done, streak=streak, saved_date=today)
    return Response(payload.model_dump(), status_code=status.HTTP_200_OK)
