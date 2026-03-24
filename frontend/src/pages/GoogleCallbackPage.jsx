import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { onboardingApi } from '../api/onboardingApi.js';
import { hasCompletedOnboarding, setCurrentUserEmail, syncOnboardingCompleted } from '../utils/onboardingGate.js';

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const accessToken = useMemo(() => searchParams.get('access_token') || '', [searchParams]);
  const email = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const error = useMemo(() => searchParams.get('error') || '', [searchParams]);

  useEffect(() => {
    const resolveAndMove = async () => {
      try {
        const completed = await onboardingApi.hasCompleted();
        if (completed && email) {
          syncOnboardingCompleted(email);
        }
        navigate(completed ? '/home' : '/survey', { replace: true });
      } catch {
        navigate(email && !hasCompletedOnboarding(email) ? '/survey' : '/home', { replace: true });
      }
    };

    if (error) {
      navigate(`/auth/login?error=${encodeURIComponent(error)}`, { replace: true });
      return;
    }

    if (!accessToken) {
      navigate('/auth/login?error=missing_access_token', { replace: true });
      return;
    }

    sessionStorage.setItem('access_token', accessToken);
    if (email) {
      setCurrentUserEmail(email);
    }
    resolveAndMove();
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
