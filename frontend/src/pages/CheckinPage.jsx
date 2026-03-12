import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTodayChallenge, saveTodayChallenge } from '../api/challengeApi.js';

const DEFAULT_FORM = {
  water_cups: 0,
  steps: 0,
  exercise_minutes: 0,
  sleep_hours: 0,
  no_snack: false,
};

const CHECKIN_GUIDE_MESSAGES = [
  '오늘 기록하면 그래프가 바로 업데이트돼요 🙂',
  '지금 체크인하면 이번 주 그래프에 바로 찍혀요!',
  '한 줄 기록만 남겨도 변화가 보여요.',
  '오늘 한 걸음, 한 잔이 그래프에 바로 반영돼요. 작은 기록부터 시작해볼까요?',
  '기록은 자동으로 오늘 날짜에 저장돼요. 지금 입력하면 흐름이 바로 보여요!',
  '체크인 한 번이면 끝! 오늘의 습관이 그래프에 쌓여요.',
  '오늘도 한 번만 찍자! 기록하면 그래프가 바로 반응해요 😎',
  '기록 안 하면 그래프도 심심해요... 오늘 한 줄만 남겨줘요!',
  '오늘 기록을 남기면 그래프가 바로 업데이트돼요. 작은 습관부터 시작해요!',
];

function pickByDay(messages) {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const dayOfYear = Math.floor(diff / 86400000);
  return messages[dayOfYear % messages.length];
}

export default function CheckinPage() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [morningLocked, setMorningLocked] = useState(false);
  const [totals, setTotals] = useState({
    water_cups: 0,
    steps: 0,
    exercise_minutes: 0,
  });

  useEffect(() => {
    getTodayChallenge()
      .then((data) => {
        const locked = Number(data.row.sleep_hours ?? 0) > 0;
        setForm({
          water_cups: 0,
          steps: 0,
          exercise_minutes: 0,
          sleep_hours: data.row.sleep_hours ?? 0,
          no_snack: Boolean(data.row.no_snack),
        });
        setTotals({
          water_cups: data.row.water_cups ?? 0,
          steps: data.row.steps ?? 0,
          exercise_minutes: data.row.exercise_minutes ?? 0,
        });
        setMorningLocked(locked);
      })
      .catch(() => {
        setForm(DEFAULT_FORM);
        setTotals({ water_cups: 0, steps: 0, exercise_minutes: 0 });
        setMorningLocked(false);
      });
  }, []);

  const onChange = (name) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : Number(e.target.value);
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const payload = await saveTodayChallenge(form);
      setMorningLocked(Number(payload.row.sleep_hours ?? 0) > 0);
      setTotals({
        water_cups: payload.row.water_cups ?? 0,
        steps: payload.row.steps ?? 0,
        exercise_minutes: payload.row.exercise_minutes ?? 0,
      });
      setForm({
        water_cups: 0,
        steps: 0,
        exercise_minutes: 0,
        sleep_hours: payload.row.sleep_hours ?? 0,
        no_snack: Boolean(payload.row.no_snack),
      });
    } catch (err) {
      window.alert(err?.response?.data?.detail || err?.message || '저장 실패: 토큰/입력값을 확인하세요.');
    } finally {
      setSaving(false);
    }
  };

  function onEditMorningCheck() {
    setMorningLocked(false);
  }

  return (
    <section className="stack">
      <article className="card challenge-checkin-head">
        <h2>체크인</h2>
        <p className="muted">{pickByDay(CHECKIN_GUIDE_MESSAGES)}</p>
      </article>

      <article className={`card checkin-extra-card ${morningLocked ? 'locked' : ''}`}>
        <div className="checkin-morning-head">
          <strong>저장 완료</strong>
          {morningLocked ? (
            <button type="button" className="checkin-edit-btn" onClick={onEditMorningCheck}>
              수정하기
            </button>
          ) : (
            <span className="checkin-lock-badge">입력 중</span>
          )}
        </div>
        <div className="checkin-morning-stack">
          <label className="challenge-field">
            <span>수면 시간</span>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={form.sleep_hours}
              onChange={onChange('sleep_hours')}
              disabled={morningLocked}
            />
          </label>
          <label className="challenge-check-row checkin-check-row">
            <span>야식 여부</span>
            <div className="checkin-check-control">
              <span>어제 야식 안 먹었어요 😀</span>
              <input type="checkbox" checked={form.no_snack} onChange={onChange('no_snack')} disabled={morningLocked} />
            </div>
          </label>
        </div>
      </article>

      <div className="checkin-stack">
        <article className="card checkin-metric-card">
          <div className="checkin-card-head">
            <strong>물 섭취량</strong>
            <strong className="green">{totals.water_cups} 컵</strong>
          </div>
          <input
            type="number"
            min="0"
            max="20"
            value={form.water_cups}
            onChange={onChange('water_cups')}
            className="checkin-input"
          />
          <p className="muted small">1컵 = 200ml</p>
        </article>

        <article className="card checkin-metric-card">
          <div className="checkin-card-head">
            <strong>걸음 수</strong>
            <strong className="green">{totals.steps} steps</strong>
          </div>
          <input type="number" min="0" max="30000" value={form.steps} onChange={onChange('steps')} className="checkin-input" />
        </article>

        <article className="card checkin-metric-card">
          <div className="checkin-card-head">
            <strong>운동 시간</strong>
            <strong className="green">{totals.exercise_minutes} min</strong>
          </div>
          <input
            type="number"
            min="0"
            max="180"
            value={form.exercise_minutes}
            onChange={onChange('exercise_minutes')}
            className="checkin-input"
          />
        </article>
      </div>

      <button type="button" className="save-btn" onClick={onSave} disabled={saving}>
        {saving ? '저장 중...' : '저장하기'}
      </button>

      <div className="checkin-nav-row">
        <Link to="/challenge" className="pill-btn checkin-nav-btn">
          챌린지로
        </Link>
        <Link to="/home" className="pill-btn checkin-nav-btn">
          홈으로
        </Link>
      </div>
    </section>
  );
}
