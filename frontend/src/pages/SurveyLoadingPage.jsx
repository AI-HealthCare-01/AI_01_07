import { Link } from 'react-router-dom';

export default function SurveyLoadingPage() {
  return (
    <section className="auth-wrap">
      <article className="auth-card center gradient-card">
        <h1>분석 중...</h1>
        <p>입력 데이터를 처리하고 있습니다.</p>
        <Link to="/survey/result" className="pill-btn">
          결과 보기
        </Link>
      </article>
    </section>
  );
}
