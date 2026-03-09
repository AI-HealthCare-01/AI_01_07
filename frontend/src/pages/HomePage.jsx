import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { healthRecordApi } from '../api/healthRecordApi.js';

function toShortDate(dateText) {
  return dateText?.slice(5) || '';
}

function riskColor(p) {
  const r = Math.round(30 + p * 210);
  const g = Math.round(170 - p * 120);
  const b = Math.round(220 - p * 200);
  return `rgb(${r}, ${g}, ${Math.max(30, b)})`;
}

function RiskTrendLineChart({ data }) {
  if (!data.length) {
    return <p className="muted">표시할 데이터가 없습니다.</p>;
  }

  const width = 100;
  const height = 60;
  const pad = 6;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const values = data.map((item) => Math.max(0, Number((item.risk_probability || 0) * 100)));
  const max = 100;
  const denom = Math.max(data.length - 1, 1);

  const points = values.map((value, idx) => {
    const x = pad + (idx / denom) * innerW;
    const y = pad + (1 - value / max) * innerH;
    return { x, y, value, raw: data[idx] };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="mini-line-wrap">
      <svg
        className="mini-line-chart"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line x1={pad} y1={pad} x2={width - pad} y2={pad} className="mini-line-guide" />
        <line x1={pad} y1={height / 2} x2={width - pad} y2={height / 2} className="mini-line-guide" />
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} className="mini-line-guide" />
        <polyline points={polyline} className="mini-line-path" style={{ stroke: '#ff7f11' }} />
        {points.map((p, idx) => (
          <circle key={`${idx}-${p.raw.date}`} cx={p.x} cy={p.y} r="1.8" style={{ fill: riskColor(p.raw.risk_probability || 0) }}>
            <title>{`${Math.round(p.value)}%`}</title>
          </circle>
        ))}
      </svg>
      <div className="mini-line-labels">
        {data.map((p) => (
          <span key={p.date}>{toShortDate(p.date)}</span>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [today, setToday] = useState({ water_ml: 0, steps: 0, exercise_minutes: 0 });
  const [riskTrend, setRiskTrend] = useState([]);

  useEffect(() => {
    healthRecordApi
      .getToday()
      .then((res) => setToday(res))
      .catch(() => setToday({ water_ml: 0, steps: 0, exercise_minutes: 0 }));

    apiClient
      .get('/v1/users/me/profile-overview')
      .then((res) => setRiskTrend(res.data?.risk_trend_7d || []))
      .catch(() => setRiskTrend([]));
  }, []);

  return (
    <section className="stack">
      <article className="hero-card">
        <p className="date-text">2026년 3월 3일 화요일</p>
        <h2>안녕하세요, 데모님</h2>
        <p>오늘의 챌린지와 건강 요약을 확인하세요.</p>
      </article>

      <article className="card">
        <div className="card-head">
          <h3>오늘의 요약</h3>
          <Link to="/checkin" className="pill-btn">
            기록하기 +
          </Link>
        </div>
        <div className="summary-grid">
          <div>
            <strong>{today.water_ml} ml</strong>
            <p>수분 섭취</p>
          </div>
          <div>
            <strong>{today.steps} 걸음</strong>
            <p>걸음 수</p>
          </div>
          <div>
            <strong>{today.exercise_minutes} 분</strong>
            <p>운동 시간</p>
          </div>
        </div>
      </article>

      <article className="card">
        <h3>당뇨 위험도 추이</h3>
        <RiskTrendLineChart data={riskTrend} />
      </article>
    </section>
  );
}
