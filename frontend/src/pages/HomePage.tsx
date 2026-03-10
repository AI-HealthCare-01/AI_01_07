import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <section className="panel">
      <h1>홈</h1>
      <p className="subtitle">오늘 기록 요약</p>

      <div className="homeStats">
        <div className="statCard">
          <div className="statLabel">물(ml)</div>
          <div className="statValue">0</div>
        </div>
        <div className="statCard">
          <div className="statLabel">걸음</div>
          <div className="statValue">0</div>
        </div>
        <div className="statCard">
          <div className="statLabel">운동(분)</div>
          <div className="statValue">0</div>
        </div>
      </div>

      <div className="buttonRow">
        <Link className="secondary linkBtn" to="/survey">
          건강 설문
        </Link>
      </div>

      <div className="buttonRow bottomCta">
        <Link className="primary linkBtn" to="/food/upload">
          식단 분석하기
        </Link>
      </div>
    </section>
  );
}
