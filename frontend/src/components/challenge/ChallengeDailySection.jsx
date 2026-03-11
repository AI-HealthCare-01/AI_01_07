import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getChallengeTrend, getTodayChallenge, saveTodayChallenge } from '../../api/challengeApi.js';

const DEFAULT_FORM = {
  steps: 0,
  exercise_minutes: 0,
  water_cups: 0,
  sleep_hours: 0,
  no_snack: false,
};

const TIER_META = {
  success: { label: '우수', className: 'success' },
  ok: { label: '안정', className: 'ok' },
  needs_attention: { label: '주의', className: 'needs-attention' },
};

function toShortDate(dateText) {
  return dateText?.slice(5) || '';
}

function formatIndex(value) {
  return Number(value || 0).toFixed(3);
}

function formatDelta(value) {
  const num = Number(value || 0);
  if (num > 0) return `-${num.toFixed(3)}`;
  if (num < 0) return `+${Math.abs(num).toFixed(3)}`;
  return '0.000';
}

export default function ChallengeDailySection({ compact = false }) {
  const [todayData, setTodayData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [today, trend] = await Promise.all([getTodayChallenge(), getChallengeTrend(7)]);
        if (!active) return;
        setTodayData(today);
        setTrendData(trend);
        setForm({
          steps: today.row.steps ?? 0,
          exercise_minutes: today.row.exercise_minutes ?? 0,
          water_cups: today.row.water_cups ?? 0,
          sleep_hours: today.row.sleep_hours ?? 0,
          no_snack: Boolean(today.row.no_snack),
        });
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : '챌린지 데이터를 불러오지 못했습니다.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  function onNumberChange(name) {
    return (e) => {
      const nextValue = e.target.value;
      setForm((prev) => ({
        ...prev,
        [name]: nextValue === '' ? 0 : Number(nextValue),
      }));
    };
  }

  function onCheckboxChange(e) {
    setForm((prev) => ({ ...prev, no_snack: e.target.checked }));
  }

  async function onSave() {
    setSaving(true);
    setError('');
    try {
      const payload = await saveTodayChallenge(form);
      const trend = await getChallengeTrend(7);
      setTodayData(payload);
      setTrendData(trend);
    } catch (e) {
      setError(e instanceof Error ? e.message : '챌린지 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const summary = todayData?.summary;
  const tierMeta = TIER_META[summary?.tier] || TIER_META.needs_attention;

  return (
    <article className="card challenge-card">
      <div className="card-head">
        <div>
          <strong>오늘의 챌린지</strong>
          <p className="food-subtitle">생활습관/당뇨 위험 지수(행동 지표)를 매일 기록으로 확인합니다.</p>
        </div>
        {summary && <span className={`challenge-tier-badge ${tierMeta.className}`}>{tierMeta.label}</span>}
      </div>

      {loading ? (
        <p className="food-subtitle">불러오는 중...</p>
      ) : (
        <>
          {summary && (
            <>
              <div className="challenge-metric-grid">
                <div className="challenge-metric-card">
                  <span>Daily Score</span>
                  <strong>{summary.daily_score}</strong>
                </div>
                <div className="challenge-metric-card">
                  <span>Behavior Index</span>
                  <strong>{formatIndex(summary.behavior_index)}</strong>
                </div>
                <div className="challenge-metric-card">
                  <span>오늘 변화</span>
                  <strong>{formatDelta(summary.delta)}</strong>
                </div>
              </div>

              <div className={`challenge-message-box ${tierMeta.className}`}>
                <strong>{tierMeta.label} 가이드</strong>
                <p>{summary.message}</p>
                <div className="challenge-tag-list">
                  {summary.tags.map((tag) => (
                    <span key={tag} className="challenge-tag">
                      #{tag.replace(/\s+/g, '')}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className={`challenge-form-grid ${compact ? 'compact' : ''}`}>
            <label className="challenge-field">
              <span>걸음 수</span>
              <input type="number" min="0" max="30000" value={form.steps} onChange={onNumberChange('steps')} />
            </label>
            <label className="challenge-field">
              <span>운동(분)</span>
              <input
                type="number"
                min="0"
                max="180"
                value={form.exercise_minutes}
                onChange={onNumberChange('exercise_minutes')}
              />
            </label>
            <label className="challenge-field">
              <span>물(컵)</span>
              <input type="number" min="0" max="20" value={form.water_cups} onChange={onNumberChange('water_cups')} />
              <small>1컵 = 200ml</small>
            </label>
            <label className="challenge-field">
              <span>수면(시간)</span>
              <input type="number" min="0" max="24" step="0.5" value={form.sleep_hours} onChange={onNumberChange('sleep_hours')} />
            </label>
          </div>

          <label className="challenge-check-row">
            <input type="checkbox" checked={form.no_snack} onChange={onCheckboxChange} />
            <span>오늘은 야식을 먹지 않았어요</span>
          </label>

          <button type="button" className="save-btn" onClick={onSave} disabled={saving}>
            {saving ? '저장 중...' : '오늘 챌린지 저장'}
          </button>

          {error && <div className="error">{error}</div>}

          <div className="challenge-trend-card">
            <div className="card-head">
              <strong>7일 행동 지표 추이</strong>
              <span className="food-subtitle">최근 7일</span>
            </div>
            <div className="challenge-trend-wrap">
              <ResponsiveContainer>
                <LineChart data={trendData}>
                  <CartesianGrid stroke="#e4edf5" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={toShortDate} tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => Number(value).toFixed(3)}
                    labelFormatter={(label) => `날짜 ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="behavior_index"
                    stroke="#179748"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#179748' }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </article>
  );
}
