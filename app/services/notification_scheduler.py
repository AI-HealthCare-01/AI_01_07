import asyncio
import random
from datetime import date, datetime

from app.core import config
from app.models.checkin import DailyHealthCheck
from app.models.predictions import OnboardingSurvey
from app.models.users import User
from app.services.notifications import NotificationService

RISK_HIGH_MESSAGES = [
    "고위험 신호가 감지되었습니다. 오늘 병원 검진 일정을 확인해 보세요.",
    "건강 위험도가 높은 상태입니다. 가능한 빠르게 전문의 상담을 권장합니다.",
    "오늘은 검진을 우선순위로 두는 날입니다. 병원 방문 계획을 세워보세요.",
]

CHALLENGE_1800_MESSAGES = [
    "챌린지가 진행중입니다! 아직 완료되지 않았습니다!",
    "오늘 챌린지 기록이 비어 있어요. 지금 입력하면 충분히 따라잡을 수 있어요.",
    "18시 체크: 챌린지 달성값을 아직 입력하지 않았습니다.",
    "조금만 더 하면 오늘 목표를 채울 수 있어요. 기록부터 남겨볼까요?",
    "오늘 챌린지를 놓치기 전에 지금 상태를 업데이트해 주세요.",
    "챌린지 미기입 상태입니다. 지금 입력하면 연속 달성 흐름을 지킬 수 있어요.",
    "퇴근 전 1분 체크! 챌린지 입력으로 오늘 루틴을 완성해 주세요.",
    "진행 중 챌린지 기록이 없습니다. 지금 기록하면 성공 확률이 올라갑니다.",
    "아직 오늘 챌린지가 완료되지 않았어요. 지금 바로 체크해 주세요.",
    "오늘도 한 칸 남았습니다. 챌린지 달성값 입력 부탁드려요.",
]

CHALLENGE_2200_MESSAGES = [
    "나약한 인간,,, 여기까지인건가?,,,",
    "아직 기회가 남았어요! 챌린지를 완성시켜주세요!",
    "22시 마지막 알림: 오늘 챌린지 기록을 지금 입력해 주세요.",
    "하루 마감 전 마지막 찬스입니다. 챌린지를 완료해 볼까요?",
    "오늘 목표를 비워두지 마세요. 마지막 입력만 남았습니다.",
    "지금 기록하면 오늘도 연속 달성 유지 가능합니다.",
    "마감 임박! 챌린지 미기입 상태를 지금 종료해 주세요.",
    "조금만 힘내면 성공입니다. 오늘 기록을 마무리해 주세요.",
    "아직 끝난 게 아닙니다. 마지막 체크로 챌린지를 지켜주세요.",
    "오늘 챌린지 최종 경고: 입력하지 않으면 미달성으로 처리됩니다.",
]

WATER_MESSAGES_1200 = [
    "점심 먹었으면 물 한 컵! 커피 대신 물로 교체해볼까요?",
    "물마시기 챌린지 진행 중입니다. 지금까지 마신 물을 기록해요.",
    "12시 리마인드: 수분 섭취 기록을 남겨 주세요.",
    "점심 이후 물 한 잔이 혈당 관리에 도움이 됩니다.",
    "물 200ml만 먼저 채워볼까요? 지금 기록해 주세요.",
    "오전보다 수분이 부족해요. 점심 타이밍에 보충해 주세요.",
    "점심 체크: 오늘 물 기록이 비어 있습니다.",
    "탄산 대신 물로 한 번 교체해 보는 건 어떨까요?",
    "오늘 목표 수분량의 첫 구간을 지금 채워보세요.",
    "물 챌린지 알림: 점심 직후 기록이 가장 쉽습니다.",
]

WATER_MESSAGES_1500 = [
    "오후 피로 구간입니다. 커피 대신 물로 리프레시해요.",
    "물은 나눠 마실수록 좋아요. 15시 체크를 입력해 주세요.",
    "3시 수분 점검: 현재 섭취량을 업데이트해 주세요.",
    "오후 집중력은 수분에서 시작됩니다. 물 기록 부탁드려요.",
    "지금 한 컵 추가하면 저녁 전에 목표에 가까워집니다.",
    "목마르기 전에 마시는 게 핵심입니다. 지금 기록해요.",
    "물 챌린지 진행중: 오후 구간 기록이 아직 없습니다.",
    "잠깐 쉬면서 물 한 잔, 그리고 기록까지 완료해 주세요.",
    "15시 리마인드: 물 입력으로 오늘 루틴을 이어가세요.",
    "작은 입력 하나가 챌린지 연속 달성을 만듭니다.",
]

WALK_MESSAGES_1730 = [
    "퇴근길 산책 타임! 오늘 걸음 수를 기록해 주세요.",
    "지금 10분만 걸어도 성공에 가까워요. 기록부터 남겨볼까요?",
    "17:30 리마인드: 걸음/운동 기록을 업데이트해 주세요.",
    "해질녘 걷기 한 번이 오늘 컨디션을 바꿉니다.",
    "지금 움직이면 저녁 전 목표 달성이 쉬워져요.",
    "걷기 챌린지 진행 중입니다. 현재 수치를 입력해 주세요.",
    "퇴근 전 1회 걷기 체크로 오늘 루틴을 채워보세요.",
    "짧게라도 걷고 기록하면 성공 확률이 올라갑니다.",
    "오늘 걸음 기록이 비어 있어요. 지금 입력해 주세요.",
    "걷기 미기입 상태입니다. 해지기 전 체크해 주세요.",
]

WALK_MESSAGES_2100 = [
    "오늘 걸음 기록이 아직 비어 있어요. 5~10분 산책해 볼까요?",
    "21시 마지막 산책 체크입니다. 지금 입력해 주세요.",
    "소파 대신 5분 걷기, 그리고 기록까지 마무리해요.",
    "밤 산책 마지막 찬스입니다. 걸음 기록을 남겨 주세요.",
    "조금만 더 움직이면 오늘 챌린지를 지킬 수 있어요.",
    "오늘 걷기 미완료 상태입니다. 마지막 점검 부탁드려요.",
    "집 앞 한 바퀴만 돌아도 충분합니다. 기록해 주세요.",
    "마감 전 걸음 수 체크로 오늘 목표를 완성해요.",
    "아직 기회가 남았습니다. 21시 걷기 입력 부탁드려요.",
    "오늘도 이어가 보죠. 걸음 기록 최종 확인 시간입니다.",
]

EXERCISE_MESSAGES_1830 = [
    "저녁 운동 골든타임! 오늘 운동 시간을 기록해 주세요.",
    "운동은 짧게라도 이깁니다. 10분 했어도 입력해 주세요.",
    "18:30 체크: 운동 기록이 아직 없습니다.",
    "지금 시작하면 오늘 목표를 충분히 달성할 수 있어요.",
    "오늘 운동 루틴을 기록으로 완성해 주세요.",
    "스트레칭이라도 좋습니다. 운동 시간을 입력해 주세요.",
    "운동 챌린지 진행 중입니다. 현재 시간을 남겨 주세요.",
    "저녁 전후 10분만 투자해도 큰 차이가 납니다.",
    "운동 미기입 상태입니다. 지금 한 번 체크해 주세요.",
    "오늘 운동칸을 비워두지 말고 지금 업데이트해 주세요.",
]

EXERCISE_MESSAGES_2130 = [
    "오늘 운동 기록이 아직 없어요. 지금이라도 5분 스트레칭 어떨까요?",
    "아직 기회가 남았어요! 운동 시간만 입력하면 챌린지 유지됩니다.",
    "21:30 마감 알림: 운동 기록을 확인해 주세요.",
    "오늘 루틴을 마무리할 마지막 타이밍입니다.",
    "아직 끝나지 않았어요. 짧게라도 움직이고 기록해 주세요.",
    "운동 미완료 상태입니다. 최종 입력을 부탁드려요.",
    "가벼운 맨몸운동 후 시간 입력으로 마무리해요.",
    "하루 마지막 체크: 운동 기록을 남겨 주세요.",
    "5분도 의미 있습니다. 기록하고 오늘을 마감하세요.",
    "오늘 운동칸을 채우고 연속 달성을 지켜주세요.",
]

SLEEP_MESSAGES_1030 = [
    "어제 몇 시간 주무셨어요? 수면시간 기록을 남겨 주세요.",
    "오늘 컨디션 체크: 어제 수면 시간을 입력해 주세요.",
    "오전 리마인드: 어제 수면 기록이 아직 없습니다.",
    "수면 기록은 오전에 입력할수록 정확합니다.",
    "10:30 체크: 어제 취침/기상 패턴을 돌아봐 주세요.",
    "컨디션 관리의 시작은 수면 기록입니다. 지금 입력해요.",
    "어제 수면시간을 남겨두면 주간 분석에 도움이 됩니다.",
    "수면 챌린지 입력 알림입니다. 기록을 완료해 주세요.",
    "오늘의 건강 루틴: 수면 기록부터 체크해 볼까요?",
    "어제 수면 데이터가 비어 있습니다. 지금 입력 부탁드려요.",
]

SLEEP_MESSAGES_2230 = [
    "이제 폰 내려놓고 잘 준비! 목표 수면 7~8시간을 지켜봐요.",
    "수면 챌린지 시간입니다. 취침 준비를 시작해 주세요.",
    "22:30 알림: 수면 루틴을 위해 화면 노출을 줄여보세요.",
    "오늘 마무리는 수면 준비로 해보세요.",
    "내일 컨디션은 지금 결정됩니다. 취침 루틴을 시작해요.",
    "늦어지기 전에 취침 준비 체크를 완료해 주세요.",
    "수면 목표를 지키려면 지금이 최적 시간입니다.",
    "나약한 인간 모드 OFF, 수면 챌린지 ON.",
    "취침 전 마지막 리마인드: 오늘은 일찍 자요.",
    "잠들기 30분 전 디지털 디톡스 시작해 볼까요?",
]

LATE_NIGHT_SNACK_MESSAGES_2030 = [
    "야식 금지 챌린지! 지금이 첫 고비예요. 오늘 상태를 체크해 주세요.",
    "배고프면 물이나 차 먼저. 야식 없이 가는 중이면 체크만 해주세요.",
    "20:30 리마인드: 야식 유혹 구간입니다. 의식적으로 피해주세요.",
    "오늘 야식 없이 지나가면 챌린지 성공에 가까워집니다.",
    "첫 유혹 타이밍입니다. 야식 여부를 점검해 주세요.",
    "냉장고 열기 전 10초 멈춤! 체크하고 지나가요.",
    "야식 챌린지 진행중: 현재 상태를 기록해 주세요.",
    "지금 결정이 내일 컨디션을 바꿉니다. 야식 체크!",
    "오늘 밤 가볍게 마무리하기 위한 리마인드입니다.",
    "야식 없는 하루를 위해 지금 상태를 확인해 주세요.",
]

LATE_NIGHT_SNACK_MESSAGES_2215 = [
    "냉장고 문 열기 직전이라면 잠깐! 지금 체크하고 멈춰요.",
    "아직 기회가 남았어요! 야식 안 먹었다면 성공 체크해 주세요.",
    "22:15 마지막 경고: 야식 유혹을 이겨내 봅시다.",
    "오늘 챌린지 마감 전 최종 점검 시간입니다.",
    "나약한 인간 모드 경고. 지금 멈추면 오늘 성공입니다.",
    "야식 여부 최종 확인 부탁드려요.",
    "이 시간만 넘기면 성공입니다. 체크하고 마무리해요.",
    "한 번만 더 버티면 오늘 챌린지 달성입니다.",
    "오늘 야식 기록을 지금 확정해 주세요.",
    "마지막 알림: 야식 없이 마감할 수 있어요.",
]


class NotificationScheduler:
    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._last_processed_minute: str = ""
        self._service = NotificationService()

    async def start(self) -> None:
        if self._task is not None:
            return
        self._task = asyncio.create_task(self._run_loop(), name="notification-scheduler")

    async def stop(self) -> None:
        if self._task is None:
            return
        self._task.cancel()
        try:
            await self._task
        except asyncio.CancelledError:
            pass
        finally:
            self._task = None

    async def _run_loop(self) -> None:
        while True:
            now = datetime.now(config.TIMEZONE).replace(second=0, microsecond=0)
            minute_key = now.strftime("%Y-%m-%d %H:%M")
            if minute_key != self._last_processed_minute:
                self._last_processed_minute = minute_key
                await self._run_for_minute(now)
            await asyncio.sleep(15)

    async def _run_for_minute(self, now: datetime) -> None:
        hm = now.strftime("%H:%M")
        if hm == "09:00":
            await self._send_high_risk_daily(now)
        if hm == "10:30":
            await self._send_sleep_1030(now)
        if hm == "12:00":
            await self._send_water_1200(now)
        if hm == "15:00":
            await self._send_water_1500(now)
        if hm == "17:30":
            await self._send_walk_1730(now)
        if hm == "18:00":
            await self._send_challenge_generic(now, is_final=False)
        if hm == "18:30":
            await self._send_exercise_1830(now)
        if hm == "21:00":
            await self._send_walk_2100(now)
        if hm == "21:30":
            await self._send_exercise_2130(now)
        if hm == "20:30":
            await self._send_no_late_snack_2030(now)
        if hm == "22:00":
            await self._send_challenge_generic(now, is_final=True)
        if hm == "22:15":
            await self._send_no_late_snack_2215(now)
        if hm == "22:30":
            await self._send_sleep_2230(now)

    async def _active_users(self) -> list[User]:
        return await User.filter(is_active=True)

    async def _today_check_map(self) -> dict[int, DailyHealthCheck]:
        today = date.today()
        rows = await DailyHealthCheck.filter(record_date=today).all()
        return {int(row.user_id): row for row in rows}

    async def _send_high_risk_daily(self, now: datetime) -> None:
        users = await self._active_users()
        if not users:
            return
        for user in users:
            latest = await OnboardingSurvey.filter(user_id=user.id).order_by("-created_at").first()
            if latest is None or str(latest.risk_stage).lower() != "high":
                continue
            await self._service.create_notification(
                user=user,
                notification_type="RISK_HIGH_0900",
                level="danger",
                icon="⚠️",
                title="고위험군 검진 권고",
                body=random.choice(RISK_HIGH_MESSAGES),
                scheduled_for=now,
                dedupe_key=f"risk_high_0900:{user.id}:{now.date().isoformat()}",
            )

    async def _send_challenge_generic(self, now: datetime, *, is_final: bool) -> None:
        users = await self._active_users()
        if not users:
            return
        checks = await self._today_check_map()
        for user in users:
            check = checks.get(int(user.id))
            is_incomplete = (check is None) or (
                int(check.water_ml) <= 0 and int(check.steps) <= 0 and int(check.exercise_minutes) <= 0
            )
            if not is_incomplete:
                continue
            slot = "2200" if is_final else "1800"
            await self._service.create_notification(
                user=user,
                notification_type=f"CHALLENGE_{slot}",
                level="warn",
                icon="🔔",
                title="챌린지 진행 알림",
                body=random.choice(CHALLENGE_2200_MESSAGES if is_final else CHALLENGE_1800_MESSAGES),
                scheduled_for=now,
                dedupe_key=f"challenge_{slot}:{user.id}:{now.date().isoformat()}",
            )

    async def _send_water_1200(self, now: datetime) -> None:
        await self._send_metric_based(
            now=now,
            notification_type="CHALLENGE_WATER_1200",
            slot="1200",
            icon="💧",
            title="물마시기 리마인드",
            body_choices=WATER_MESSAGES_1200,
            is_pending=lambda c: c is None or int(c.water_ml) <= 0,
        )

    async def _send_water_1500(self, now: datetime) -> None:
        await self._send_metric_based(
            now=now,
            notification_type="CHALLENGE_WATER_1500",
            slot="1500",
            icon="💧",
            title="오후 수분 리마인드",
            body_choices=WATER_MESSAGES_1500,
            is_pending=lambda c: c is None or int(c.water_ml) <= 0,
        )

    async def _send_walk_1730(self, now: datetime) -> None:
        await self._send_metric_based(
            now=now,
            notification_type="CHALLENGE_WALK_1730",
            slot="1730",
            icon="🚶",
            title="걷기 운동 리마인드",
            body_choices=WALK_MESSAGES_1730,
            is_pending=lambda c: c is None or int(c.steps) <= 0,
        )

    async def _send_walk_2100(self, now: datetime) -> None:
        await self._send_metric_based(
            now=now,
            notification_type="CHALLENGE_WALK_2100",
            slot="2100",
            icon="🚶",
            title="걷기 마지막 찬스",
            body_choices=WALK_MESSAGES_2100,
            is_pending=lambda c: c is None or int(c.steps) <= 0,
        )

    async def _send_exercise_1830(self, now: datetime) -> None:
        await self._send_metric_based(
            now=now,
            notification_type="CHALLENGE_EXERCISE_1830",
            slot="1830",
            icon="💪",
            title="운동 리마인드",
            body_choices=EXERCISE_MESSAGES_1830,
            is_pending=lambda c: c is None or int(c.exercise_minutes) <= 0,
        )

    async def _send_exercise_2130(self, now: datetime) -> None:
        await self._send_metric_based(
            now=now,
            notification_type="CHALLENGE_EXERCISE_2130",
            slot="2130",
            icon="💪",
            title="운동 마감 알림",
            body_choices=EXERCISE_MESSAGES_2130,
            is_pending=lambda c: c is None or int(c.exercise_minutes) <= 0,
        )

    async def _send_sleep_1030(self, now: datetime) -> None:
        await self._send_general(
            now=now,
            notification_type="CHALLENGE_SLEEP_1030",
            slot="1030",
            icon="😴",
            title="수면시간 기록 리마인드",
            body_choices=SLEEP_MESSAGES_1030,
            level="info",
        )

    async def _send_sleep_2230(self, now: datetime) -> None:
        await self._send_general(
            now=now,
            notification_type="CHALLENGE_SLEEP_2230",
            slot="2230",
            icon="😴",
            title="취침 준비 알림",
            body_choices=SLEEP_MESSAGES_2230,
            level="info",
        )

    async def _send_no_late_snack_2215(self, now: datetime) -> None:
        await self._send_general(
            now=now,
            notification_type="CHALLENGE_NO_LATE_SNACK_2215",
            slot="2215",
            icon="🥙",
            title="야식 금지 마지막 경고",
            body_choices=LATE_NIGHT_SNACK_MESSAGES_2215,
            level="warn",
        )

    async def _send_no_late_snack_2030(self, now: datetime) -> None:
        await self._send_general(
            now=now,
            notification_type="CHALLENGE_NO_LATE_SNACK_2030",
            slot="2030",
            icon="🥙",
            title="야식 금지 리마인드",
            body_choices=LATE_NIGHT_SNACK_MESSAGES_2030,
            level="info",
        )

    async def _send_general(
        self,
        *,
        now: datetime,
        notification_type: str,
        slot: str,
        icon: str,
        title: str,
        body_choices: list[str],
        level: str,
    ) -> None:
        users = await self._active_users()
        for user in users:
            await self._service.create_notification(
                user=user,
                notification_type=notification_type,
                level=level,
                icon=icon,
                title=title,
                body=random.choice(body_choices),
                scheduled_for=now,
                dedupe_key=f"{slot}:{notification_type}:{user.id}:{now.date().isoformat()}",
            )

    async def _send_metric_based(
        self,
        *,
        now: datetime,
        notification_type: str,
        slot: str,
        icon: str,
        title: str,
        body_choices: list[str],
        is_pending,
    ) -> None:
        users = await self._active_users()
        if not users:
            return
        checks = await self._today_check_map()
        for user in users:
            check = checks.get(int(user.id))
            if not is_pending(check):
                continue
            await self._service.create_notification(
                user=user,
                notification_type=notification_type,
                level="info",
                icon=icon,
                title=title,
                body=random.choice(body_choices),
                scheduled_for=now,
                dedupe_key=f"{slot}:{notification_type}:{user.id}:{now.date().isoformat()}",
            )
