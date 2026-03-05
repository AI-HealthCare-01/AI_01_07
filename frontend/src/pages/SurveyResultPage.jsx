import { Link } from 'react-router-dom';

export default function SurveyResultPage() {
  return (
    <section className="auth-wrap">
      <article className="auth-card">
        <div className="risk-banner">
          <p>고위험군입니다</p>
          <strong>예측 위험도 점수 89</strong>
        </div>
        <ul className="simple-list">
          <li>BMI: 비만</li>
          <li>가족력: 해당</li>
          <li>고혈압: 있음</li>
          <li>운동: 매우 부족</li>
          <li>흡연: 과거 흡연</li>
        </ul>
        <Link to="/home" className="save-btn center">
          앱 홈으로 이동
        </Link>
      </article>
    </section>
  );
}
