import { signInWithPopup } from 'firebase/auth';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { onboardingApi } from '../api/onboardingApi.js';
import { firebaseAuth, googleProvider } from '../lib/firebase.js';
import { hasCompletedOnboarding, setCurrentUserEmail, syncOnboardingCompleted } from '../utils/onboardingGate.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const oauthError = useMemo(() => searchParams.get('error') || '', [searchParams]);

  const resolveNextPath = async (userEmail) => {
    try {
      const completed = await onboardingApi.hasCompleted();
      if (completed && userEmail) {
        syncOnboardingCompleted(userEmail);
      }
      return completed ? '/home' : '/survey';
    } catch {
      return hasCompletedOnboarding(userEmail) ? '/home' : '/survey';
    }
  };

  const onLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await apiClient.post('/v1/auth/login', { email, password });
      localStorage.setItem('access_token', response.data.access_token);
      setCurrentUserEmail(email);
      const nextPath = await resolveNextPath(email);
      navigate(nextPath);
    } catch (err) {
      setError(err?.response?.data?.detail || '로그인 실패');
    }
  };

  const onGoogleLogin = async () => {
    setError('');
    if (!firebaseAuth) {
      setError('Firebase 설정이 비어 있습니다. VITE_FIREBASE_* 환경변수를 확인하세요.');
      return;
    }

    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const idToken = await result.user.getIdToken();
      const response = await apiClient.post('/v1/auth/firebase-google', { id_token: idToken });
      localStorage.setItem('access_token', response.data.access_token);
      const googleEmail = response.data.email || result.user.email || '';
      setCurrentUserEmail(googleEmail);
      const nextPath = await resolveNextPath(googleEmail);
      navigate(nextPath);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Google 로그인 실패');
    }
  };

  return (
    <section className="auth-wrap">
      <article className="auth-card">
        <h1>로그인</h1>
        <form className="form-stack" onSubmit={onLogin}>
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="save-btn">
            로그인
          </button>
        </form>
        {error && <p className="status">{error}</p>}
        {oauthError && <p className="status">Google 로그인 실패: {oauthError}</p>}
        <button type="button" className="google-btn" onClick={onGoogleLogin}>
          Google로 시작하기
        </button>
        <Link to="/auth/signup" className="link-inline">
          회원가입 화면 보기
        </Link>
      </article>
    </section>
  );
}
