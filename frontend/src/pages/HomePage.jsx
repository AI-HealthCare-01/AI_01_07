import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiClient } from '../api/client.js';
import { getChallengeTrend, getTodayChallenge } from '../api/challengeApi.js';
import { loadActiveChallenge, loadChallengeTargetOverrides } from '../utils/challengeSelection.js';

function toShortDate(dateText) {
  if (!dateText) return '';
  return new Date(`${dateText}T00:00:00+09:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  });
}

function getWeekStart(date = new Date()) {
  const base = new Date(date);
  const day = base.getDay();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() - day);
  return base;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getHealthStatusLabel(healthScore) {
  if (healthScore >= 0.67) return '양호';
  if (healthScore >= 0.34) return '보통';
  return '주의';
}

function isMissingRecord(point) {
  return point?.daily_score == null || (Number(point?.daily_score) === 0 && Number(point?.behavior_index) === 0.5);
}

function ChallengeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="home-graph-tooltip">
      <span className="home-graph-tooltip-date">{toShortDate(label)}</span>
      <strong>상태: {point.hasRecord ? point.statusLabel : '기록 없음'}</strong>
      <p>오늘 변화: {point.hasRecord ? `${point.deltaLabel}` : '-'}</p>
    </div>
  );
}

function ChallengeDot(props) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;

  if (!payload?.hasRecord) {
    return <circle cx={cx} cy={cy} r={4} fill="#ffffff" stroke="#c4cdd7" strokeWidth={2} />;
  }

  return <circle cx={cx} cy={cy} r={4} fill="#168a42" stroke="#dff6e7" strokeWidth={2} />;
}

function formatTodayLabel() {
  return new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'Asia/Seoul',
  });
}

function pickByDay(messages) {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const dayOfYear = Math.floor(diff / 86400000);
  return messages[dayOfYear % messages.length];
}

function getSuccessStreak(points) {
  let streak = 0;
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const point = points[i];
    if (point?.tier === 'success' && Number(point?.daily_score || 0) > 0) {
      streak += 1;
      continue;
    }
    break;
  }
  return streak;
}

function getHeroMessage(points) {
  const completedPoints = points.filter((point) => Number(point?.daily_score || 0) > 0);
  const todayPoint = points[points.length - 1];
  const successStreak = getSuccessStreak(points);

  if (completedPoints.length === 0) {
    return pickByDay([
      '오늘의 챌린지 화이팅!',
      '첫 기록이 좋은 흐름의 시작이에요.',
      '오늘 한 번의 체크인이 이번 주 그래프를 바꿔요.',
      '가볍게 시작해도 충분해요. 오늘 기록 남겨볼까요?',
      '작은 실천 하나가 좋은 리듬을 만듭니다.',
      '오늘의 건강 관리, 천천히 시작해봐요.',
    ]);
  }

  if (todayPoint?.tier === 'success' && successStreak >= 2) {
    return pickByDay([
      '이대로만 가보자고!',
      '연속 성공, 지금 흐름 아주 좋아요.',
      '좋은 리듬입니다. 오늘도 안정적으로 가고 있어요.',
      '꾸준함이 쌓이고 있어요. 지금 페이스 좋습니다.',
      '이번 주 흐름이 단단해지고 있어요.',
      '잘 하고 있어요. 오늘도 이어가봅시다.',
    ]);
  }

  if (todayPoint?.tier === 'success') {
    return pickByDay([
      '오늘도 좋은 흐름으로 가고 있어요.',
      '좋은 기록이에요. 이 페이스를 이어가봐요.',
      '오늘의 실천이 차곡차곡 쌓이고 있어요.',
      '하나씩 해내는 중이에요. 지금처럼만 가요.',
      '지금의 리듬, 꽤 좋습니다.',
      '오늘도 잘 해냈어요. 내일도 가볍게 이어가요.',
    ]);
  }

  if (todayPoint?.tier === 'needs_attention') {
    return pickByDay([
      '다시 도전하는 당신 아름다워!',
      '오늘이 다시 흐름을 만드는 출발점이에요.',
      '한 번 쉬어가도 괜찮아요. 다시 시작하면 됩니다.',
      '가볍게 한 가지부터 다시 해봐요.',
      '오늘 기록 하나로 분위기를 바꿀 수 있어요.',
      '지금부터 다시 쌓아도 늦지 않았어요.',
    ]);
  }

  return pickByDay([
    '오늘도 차분하게 건강 관리를 이어가봐요.',
    '이번 주 리듬을 천천히 만들어가고 있어요.',
    '하루 한 번의 기록이 좋은 기준이 됩니다.',
    '오늘의 챌린지를 가볍게 이어가봐요.',
    '작은 실천이 모이면 좋은 흐름이 됩니다.',
    '오늘도 나를 위한 기록을 남겨봐요.',
  ]);
}

export default function HomePage() {
  const [trendData, setTrendData] = useState([]);
  const [displayName, setDisplayName] = useState('사용자');
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [todayRow, setTodayRow] = useState(null);
  const [targetOverrides, setTargetOverrides] = useState({});

  useEffect(() => {
    getChallengeTrend(7)
      .then((trend) => setTrendData(trend))
      .catch(() => setTrendData([]));

    getTodayChallenge()
      .then((today) => setTodayRow(today.row))
      .catch(() => setTodayRow(null));

    apiClient
      .get('/v1/users/me/profile-overview')
      .then((res) => setDisplayName(res.data?.name || '사용자'))
      .catch(() => setDisplayName('사용자'));

    setActiveChallenge(loadActiveChallenge());
    setTargetOverrides(loadChallengeTargetOverrides());
  }, []);

  const weekGraphData = (() => {
    const start = getWeekStart();
    const pointMap = new Map(trendData.map((point) => [point.date, point]));

    return Array.from({ length: 7 }, (_, index) => {
      const current = new Date(start);
      current.setDate(start.getDate() + index);
      const isoDate = toIsoDate(current);
      const point = pointMap.get(isoDate) || { date: isoDate, behavior_index: 0.5, daily_score: null };
      const hasRecord = !isMissingRecord(point);
      const behaviorIndex = Number(point?.behavior_index ?? 0.5);
      const healthScore = 1 - behaviorIndex;
      const deltaValue = Number(point?.delta ?? 0);

      return {
        ...point,
        date: isoDate,
        hasRecord,
        health_score: healthScore,
        statusLabel: getHealthStatusLabel(healthScore),
        daily_score: point?.daily_score == null ? null : Number(point.daily_score),
        deltaLabel: deltaValue > 0 ? `+${deltaValue.toFixed(3)}` : deltaValue.toFixed(3),
      };
    });
  })();

  const activeChallengeProgress = (() => {
    if (!activeChallenge || !todayRow) return activeChallenge;
    const valueMap = {
      '물 마시기': Number(todayRow.water_cups ?? 0),
      '걷기 운동': Number(todayRow.steps ?? 0),
      운동: Number(todayRow.exercise_minutes ?? 0),
      수면시간: Number(todayRow.sleep_hours ?? 0),
      '야식 금지': todayRow.no_snack ? 1 : 0,
    };
    const current = valueMap[activeChallenge.title] ?? activeChallenge.current ?? 0;
    const target = targetOverrides[activeChallenge.title] ?? activeChallenge.target;
    const progress = Math.max(0, Math.min(100, Math.round((current / target) * 100)));
    return { ...activeChallenge, current, target, progress };
  })();

  return (
    <section className="stack">
      <article className="hero-card">
        <p className="date-text">{formatTodayLabel()}</p>
        <h2>안녕하세요, {displayName}님</h2>
        <p>{getHeroMessage(trendData)}</p>
      </article>

      <article className="card home-graph-card">
        <div className="card-head">
          <div>
            <span className="home-summary-badge">이번 주 요약</span>
            <h3>나의 건강 그래프</h3>
          </div>
          <Link to="/checkin" className="pill-btn">
            기록하기
          </Link>
        </div>
        {!weekGraphData.some((point) => point.hasRecord) && (
          <p className="home-empty-guide">
            이번 주 기록이 아직 부족해요. 체크인에서 오늘 기록을 남기면 그래프가 바뀌어요.
          </p>
        )}

        <div className="challenge-trend-card">
          <div className="challenge-trend-wrap">
            <ResponsiveContainer>
              <LineChart data={weekGraphData}>
                <CartesianGrid stroke="#e4edf5" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  interval={0}
                  tickFormatter={toShortDate}
                  tick={{ fontSize: 11 }}
                  tickMargin={8}
                />
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 0.5, 1]}
                  tickFormatter={(value) => {
                    if (value === 1) return '양호';
                    if (value === 0.5) return '보통';
                    return '주의';
                  }}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<ChallengeTooltip />} />
                <Line
                  type="monotone"
                  dataKey="health_score"
                  stroke="#8fd9a7"
                  strokeWidth={3}
                  dot={<ChallengeDot />}
                  activeDot={{ r: 5, fill: '#168a42', stroke: '#dff6e7', strokeWidth: 2 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </article>

      {activeChallengeProgress && (
        <article className="card home-active-challenge-card">
          <div className="card-head">
            <div>
              <span className="home-summary-badge">진행중 챌린지</span>
              <h3>
                {activeChallengeProgress.icon} {activeChallengeProgress.title}
              </h3>
            </div>
            <Link to="/checkin" className="pill-btn">
              계속하기
            </Link>
          </div>
          <div className="challenge-focus-card">
            <p className="challenge-focus-title">
              현재 {activeChallengeProgress.current}
              {activeChallengeProgress.unit} / 목표 {activeChallengeProgress.target}
              {activeChallengeProgress.unit}
            </p>
            <div className="challenge-progress-track">
              <div className="challenge-progress-bar" style={{ width: `${activeChallengeProgress.progress ?? 0}%` }} />
            </div>
            <p className="muted small">진행도 {activeChallengeProgress.progress ?? 0}%</p>
          </div>
        </article>
      )}
    </section>
  );
}
