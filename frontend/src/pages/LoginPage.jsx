import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await apiClient.post('/v1/auth/login', { email, password });
      localStorage.setItem('access_token', response.data.access_token);
      navigate('/home');
    } catch (err) {
      setError(err?.response?.data?.detail || '로그인 실패');
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
        <Link to="/auth/signup" className="link-inline">
          회원가입 화면 보기
        </Link>
      </article>
    </section>
  );
}
