import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { onboardingApi } from '../api/onboardingApi.js';
import { getCurrentUserEmail, markOnboardingCompleted } from '../utils/onboardingGate.js';

export default function SurveyLoadingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const form = location.state?.form;
    if (!form) {
      navigate('/survey', { replace: true });
      return;
    }

    onboardingApi
      .run(form)
      .then((result) => {
        markOnboardingCompleted(getCurrentUserEmail());
        navigate('/survey/result', { replace: true, state: { result } });
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || '분석 요청에 실패했습니다.');
      });
  }, [location.state, navigate]);

  return (
    <section className="auth-wrap">
      <article className="auth-card center gradient-card">
        <h1>분석 중...</h1>
        {!error ? <p>입력 데이터를 처리하고 있습니다.</p> : <p>{error}</p>}
        {error && (
          <Link to="/survey" className="pill-btn">
            설문으로 돌아가기
          </Link>
        )}
      </article>
    </section>
  );
}
