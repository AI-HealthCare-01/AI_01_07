import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { onboardingApi } from '../api/onboardingApi.js';
import {
  getCurrentUserEmail,
  markOnboardingCompleted,
  saveOnboardingBmiSnapshot,
  saveOnboardingRiskSnapshot,
} from '../utils/onboardingGate.js';

function getErrorMessage(err) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  const status = Number(err?.response?.status);
  if (status === 401) {
    return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
  }
  if (status >= 500) {
    return '서버 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }
  if (err?.code === 'ECONNABORTED' || String(err?.message || '').toLowerCase().includes('timeout')) {
    return '분석 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.';
  }
  if (!err?.response) {
    return '네트워크 연결을 확인해 주세요.';
  }
  return '분석 요청에 실패했습니다.';
}

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
        const email = getCurrentUserEmail();
        markOnboardingCompleted(email);
        saveOnboardingRiskSnapshot(email, result?.risk_probability);
        const h = Number(form?.height_cm || 0);
        const w = Number(form?.weight_kg || 0);
        const bmi = h > 0 && w > 0 ? w / (((h / 100) ** 2) + 1e-9) : 0;
        saveOnboardingBmiSnapshot(email, { height_cm: h, weight_kg: w, bmi });
        navigate('/survey/result', { replace: true, state: { result } });
      })
      .catch((err) => {
        setError(getErrorMessage(err));
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
