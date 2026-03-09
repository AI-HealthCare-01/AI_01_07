import { Link, useLocation } from 'react-router-dom';

function stageLabel(stage) {
  if (stage === 'normal') return '정상군';
  if (stage === 'borderline') return '경계군';
  return '고위험군';
}

export default function SurveyResultPage() {
  const location = useLocation();
  const result = location.state?.result;

  if (!result) {
    return (
      <section className="auth-wrap">
        <article className="auth-card">
          <p>결과 데이터가 없습니다. 설문을 다시 제출해 주세요.</p>
          <Link to="/survey" className="save-btn center">
            설문으로 이동
          </Link>
        </article>
      </section>
    );
  }

  return (
    <section className="auth-wrap">
      <article className="auth-card">
        <div className="risk-banner">
          <p>{stageLabel(result.risk_stage)}입니다</p>
          <strong>예측 위험도 {Math.round(result.risk_probability * 100)}%</strong>
        </div>
        <ul className="simple-list">
          {result.recommended_actions?.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
        <p>{result.message}</p>
        <p className="medical-disclaimer">
          안내: 본 결과는 생활습관 개선을 위한 참고/권고 정보이며, 전문 의료진의 진단 또는 의학적 소견을 대체하지 않습니다.
        </p>
        <Link to="/home" className="save-btn center">
          앱 홈으로 이동
        </Link>
      </article>
    </section>
  );
}
