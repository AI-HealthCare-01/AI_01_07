import { useEffect, useMemo, useState } from 'react';
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
import { buildDailyChallengeItems, getDailyAchievementScore } from '../utils/dailyChallengeMetrics.js';

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

function clamp(value, low, high) {
  return Math.max(low, Math.min(value, high));
}

function getHeroMessage(points) {
  const completedPoints = points.filter((point) => Number(point?.daily_score || 0) > 0);
  const todayPoint = points[points.length - 1];

  if (completedPoints.length === 0) {
    return '오늘의 챌린지 화이팅! 작은 기록 하나가 이번 주 흐름을 바꿔요.';
  }
  if (todayPoint?.tier === 'success') {
    return '좋은 흐름입니다. 오늘의 실천이 건강 관리 리듬으로 이어지고 있어요.';
  }
  if (todayPoint?.tier === 'needs_attention') {
    return '다시 도전하는 당신 아름다워! 오늘 기록 하나로 분위기를 바꿀 수 있어요.';
  }
  return '오늘도 차분하게 건강 관리를 이어가봐요.';
}

function getRiskStageLabel(riskProbability) {
  if (riskProbability >= 0.7) return '위험';
  if (riskProbability > 0.4) return '주의';
  return '정상';
}

function getRiskStageColor(stageLabel) {
  if (stageLabel === '위험') {
    return { fill: '#df5b57', stroke: '#f9d9d7' };
  }
  if (stageLabel === '주의') {
    return { fill: '#e4bf4a', stroke: '#f8efd0' };
  }
  return { fill: '#16934a', stroke: '#dff6e7' };
}

function getScoreTone(score) {
  if (score >= 80) return 'good';
  if (score >= 50) return 'steady';
  return 'care';
}

function RiskTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const point = payload.find((item) => item?.payload)?.payload;
  if (!point) return null;

  return (
    <div className="home-graph-tooltip">
      <span className="home-graph-tooltip-date">{toShortDate(label)}</span>
      {point.hasBehaviorRecord ? (
        <>
          <strong>상태: {point.riskStageLabel}</strong>
          <p>위험도: {point.riskPercent}%</p>
        </>
      ) : (
        <>
          <strong>기록 없음</strong>
          <p>기본값 표시</p>
        </>
      )}
    </div>
  );
}

function RiskDot(props) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;

  if (!payload?.hasBehaviorRecord) {
    return <circle cx={cx} cy={cy} r={4} fill="#ffffff" stroke="#c4cdd7" strokeWidth={2} />;
  }

  const colors = getRiskStageColor(payload.riskStageLabel);
  return <circle cx={cx} cy={cy} r={4} fill={colors.fill} stroke={colors.stroke} strokeWidth={2} />;
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

export default function HomePage() {
  const [trendData, setTrendData] = useState([]);
  const [displayName, setDisplayName] = useState('사용자');
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [todayRow, setTodayRow] = useState(null);
  const [targetOverrides, setTargetOverrides] = useState({});
  const [profileOverview, setProfileOverview] = useState(null);
  const [showPerfectCelebration, setShowPerfectCelebration] = useState(false);

  useEffect(() => {
    getChallengeTrend(7)
      .then((trend) => setTrendData(trend))
      .catch(() => setTrendData([]));

    getTodayChallenge()
      .then((today) => setTodayRow(today.row))
      .catch(() => setTodayRow(null));

    apiClient
      .get('/v1/users/me/profile-overview')
      .then((res) => {
        setDisplayName(res.data?.name || '사용자');
        setProfileOverview(res.data || null);
      })
      .catch(() => {
        setDisplayName('사용자');
        setProfileOverview(null);
      });

    setActiveChallenge(loadActiveChallenge());
    setTargetOverrides(loadChallengeTargetOverrides());
  }, []);

  const weeklyRiskData = useMemo(() => {
    const start = getWeekStart();
    const challengeMap = new Map(trendData.map((point) => [point.date, point]));
    const surveyPoints = profileOverview?.risk_trend_7d ?? [];
    const surveyMap = new Map(surveyPoints.map((point) => [point.date, Number(point.risk_probability ?? 0.5)]));
    const latestSurveyRisk =
      surveyPoints.length > 0 ? Number(surveyPoints[surveyPoints.length - 1]?.risk_probability ?? 0.5) : 0.5;

    return Array.from({ length: 7 }, (_, index) => {
      const current = new Date(start);
      current.setDate(start.getDate() + index);
      const isoDate = toIsoDate(current);
      const challengePoint = challengeMap.get(isoDate) ?? null;
      const baseRisk = Number(surveyMap.get(isoDate) ?? latestSurveyRisk);
      const behaviorIndex = Number(challengePoint?.behavior_index ?? 0.5);
      const hasBehaviorRecord = Boolean(challengePoint?.has_record);

      const goodEffect = Math.max(0, 0.5 - behaviorIndex);
      const careEffect = Math.max(0, behaviorIndex - 0.5);
      const adjustedRisk = hasBehaviorRecord
        ? clamp(baseRisk - goodEffect * 1.1 + careEffect * 0.45, 0, 1)
        : clamp(baseRisk, 0, 1);

      return {
        date: isoDate,
        risk_probability: adjustedRisk,
        risk_normal: adjustedRisk <= 0.4 ? adjustedRisk : null,
        risk_caution: adjustedRisk > 0.4 && adjustedRisk < 0.7 ? adjustedRisk : null,
        risk_danger: adjustedRisk >= 0.7 ? adjustedRisk : null,
        riskPercent: Math.round(adjustedRisk * 100),
        riskStageLabel: getRiskStageLabel(adjustedRisk),
        hasBehaviorRecord,
      };
    });
  }, [profileOverview, trendData]);

  const visibleChallengeItems = useMemo(
    () => buildDailyChallengeItems(todayRow, targetOverrides).slice(0, 4),
    [todayRow, targetOverrides],
  );

  const todayHealthScore = useMemo(() => {
    return clamp(getDailyAchievementScore(visibleChallengeItems), 0, 100);
  }, [visibleChallengeItems]);
  const hasTodayRecord = Boolean(todayRow?.id);

  useEffect(() => {
    if (!hasTodayRecord || todayHealthScore < 100) {
      setShowPerfectCelebration(false);
      return undefined;
    }

    setShowPerfectCelebration(true);
    const timer = window.setTimeout(() => setShowPerfectCelebration(false), 2400);
    return () => window.clearTimeout(timer);
  }, [hasTodayRecord, todayHealthScore]);

  const scoreTone = getScoreTone(todayHealthScore);
  const todaySummaryItems = [
    { label: '물 섭취량', value: `${Number(todayRow?.water_cups ?? 0)}컵` },
    { label: '걸음 수', value: `${Number(todayRow?.steps ?? 0).toLocaleString()}걸음` },
    { label: '운동 시간', value: `${Number(todayRow?.exercise_minutes ?? 0)}분` },
  ];

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

  const hasSurvey = Boolean(profileOverview?.onboarding_completed);
  const hasRiskRecords = weeklyRiskData.some((point) => point.hasBehaviorRecord);

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
            <h3>당뇨 발병률 예측</h3>
          </div>
          <Link to="/checkin" className="pill-btn">
            기록하기
          </Link>
        </div>
        {!hasSurvey && (
          <p className="home-empty-guide">
            설문 기반 위험도 정보가 아직 없어요. 설문을 먼저 완료하면 변화 그래프를 볼 수 있어요.
          </p>
        )}
        {hasSurvey && !hasRiskRecords && (
          <p className="home-empty-guide">
            이번 주 기록이 아직 부족해요. 체크인에서 오늘 기록을 남기면 위험도 변화가 더 또렷하게 보여요.
          </p>
        )}

        <div className="home-risk-legend" aria-label="risk-level-legend">
          <span className="home-risk-legend-item normal">
            <i />
            정상
          </span>
          <span className="home-risk-legend-item caution">
            <i />
            주의
          </span>
          <span className="home-risk-legend-item danger">
            <i />
            위험
          </span>
        </div>

        <div className="challenge-trend-card">
          <div className="challenge-trend-wrap">
            <ResponsiveContainer>
              <LineChart data={weeklyRiskData}>
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
                  ticks={[0, 0.4, 0.7, 1]}
                  tickFormatter={(value) => {
                    if (value === 1) return '100';
                    if (value === 0.7) return '70';
                    if (value === 0.4) return '40';
                    return '0';
                  }}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<RiskTooltip />} />
                <Line
                  type="monotone"
                  dataKey="risk_normal"
                  stroke="#27a85f"
                  strokeWidth={3}
                  dot={false}
                  activeDot={false}
                />
                <Line
                  type="monotone"
                  dataKey="risk_caution"
                  stroke="#d8b33d"
                  strokeWidth={3}
                  dot={false}
                  activeDot={false}
                />
                <Line
                  type="monotone"
                  dataKey="risk_danger"
                  stroke="#df5b57"
                  strokeWidth={3}
                  dot={false}
                  activeDot={false}
                />
                <Line
                  type="monotone"
                  dataKey="risk_probability"
                  stroke="transparent"
                  strokeWidth={1}
                  dot={<RiskDot />}
                  activeDot={<RiskDot />}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </article>

      <article className={`card home-score-card ${scoreTone} ${showPerfectCelebration ? 'perfect' : ''}`}>
        {showPerfectCelebration && (
          <div className="home-score-confetti" aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => (
              <span key={index} className={`home-score-confetti-piece piece-${index % 6}`} />
            ))}
          </div>
        )}
        <div className="card-head">
          <div>
            <h3>오늘 건강 점수</h3>
            {hasTodayRecord && todayHealthScore === 100 && <p className="home-score-perfect-copy">Perfect 100</p>}
          </div>
          <Link to="/checkin" className="pill-btn">
            기록하기
          </Link>
        </div>
        <div className="home-score-row">
          <div className="home-score-value">
            {hasTodayRecord ? (
              <>
                <strong>{todayHealthScore}</strong>
                <span>/100</span>
              </>
            ) : (
              <strong>오늘 아직 기록이 없어요</strong>
            )}
          </div>
          <p className="home-score-copy">
            {hasTodayRecord
              ? '오늘의 물, 걷기, 운동, 수면 목표 달성도를 바탕으로 계산되는 점수예요. 오늘 목표를 많이 채울수록 점수가 높아져요.'
              : '이 화면의 기본값은 이전 행동 지표를 이어서 보여주지만, 오늘 기록 전까지는 점수로 확정되지 않아요.'}
          </p>
        </div>
      </article>

      <article className="card home-daily-summary-card">
        <div className="card-head">
          <div>
            <span className="home-summary-badge">오늘 누적</span>
            <h3>체크인 기록</h3>
          </div>
        </div>
        <div className="home-daily-summary-grid">
          {todaySummaryItems.map((item) => (
            <div key={item.label} className="home-daily-summary-item">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
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
