import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { hasCompletedOnboarding, setCurrentUserEmail } from '../utils/onboardingGate.js';

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const accessToken = useMemo(() => searchParams.get('access_token') || '', [searchParams]);
  const email = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const error = useMemo(() => searchParams.get('error') || '', [searchParams]);

  useEffect(() => {
    if (error) {
      navigate(`/auth/login?error=${encodeURIComponent(error)}`, { replace: true });
      return;
    }

    if (!accessToken) {
      navigate('/auth/login?error=missing_access_token', { replace: true });
      return;
    }

    localStorage.setItem('access_token', accessToken);
    if (email) {
      setCurrentUserEmail(email);
    }
    navigate(email && !hasCompletedOnboarding(email) ? '/survey' : '/home', { replace: true });
  }, [accessToken, email, error, navigate]);

  return (
    <section className="auth-wrap">
      <article className="auth-card center">
        <h1>Google 로그인 처리 중</h1>
        <p>잠시만 기다려 주세요.</p>
      </article>
    </section>
  );
}

