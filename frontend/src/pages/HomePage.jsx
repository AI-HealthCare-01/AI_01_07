import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { healthRecordApi } from '../api/healthRecordApi.js';

export default function HomePage() {
  const [today, setToday] = useState({ water_ml: 0, steps: 0, exercise_minutes: 0 });

  useEffect(() => {
    healthRecordApi
      .getToday()
      .then((res) => setToday(res))
      .catch(() => setToday({ water_ml: 0, steps: 0, exercise_minutes: 0 }));
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
        <p className="muted">위험 점수 그래프 영역 (연동 예정)</p>
      </article>
    </section>
  );
}
