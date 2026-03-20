import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.js';

function extractSignupError(err) {
  if (!err?.response) return '서버 연결에 실패했습니다. 배포 서버 또는 API 상태를 확인하세요.';
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === 'string') return first;
    if (first?.msg) return first.msg;
  }
  return `회원가입 실패 (HTTP ${err?.response?.status ?? 'unknown'})`;
}

function isValidPassword(password) {
  return (
    password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /[0-9]/.test(password)
    && /[^a-zA-Z0-9]/.test(password)
  );
}

function isValidPhoneNumber(phoneNumber) {
  return /^(010-\d{4}-\d{4}|010\d{8}|\+8210\d{8})$/.test(phoneNumber);
}

function isOverFourteen(birthDate) {
  if (!birthDate) return false;
  const today = new Date();
  const birthday = new Date(birthDate);
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDiff = today.getMonth() - birthday.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
    age -= 1;
  }
  return age >= 14;
}

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    gender: 'MALE',
    birth_date: '',
    phone_number: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onChange = (name) => (e) => {
    setForm((prev) => ({ ...prev, [name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.passwordConfirm) {
      setError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    if (!isValidPassword(form.password)) {
      setError('비밀번호는 8자 이상이며 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다.');
      return;
    }
    if (!isValidPhoneNumber(form.phone_number)) {
      setError('휴대폰 번호는 01012345678, 010-1234-5678, +821012345678 형식만 가능합니다.');
      return;
    }
    if (!isOverFourteen(form.birth_date)) {
      setError('서비스 약관에 따라 만 14세 미만은 회원가입이 불가합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/v1/auth/signup', {
        email: form.email,
        password: form.password,
        name: form.name,
        gender: form.gender,
        birth_date: form.birth_date,
        phone_number: form.phone_number,
      });
      navigate('/auth/signup/sent');
    } catch (err) {
      setError(extractSignupError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-wrap">
      <article className="auth-card">
        <h1>회원가입</h1>
        <form className="form-stack" onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="이메일"
            value={form.email}
            onChange={onChange('email')}
            required
          />
          <input
            type="password"
            placeholder="비밀번호 (예: Password123!)"
            value={form.password}
            onChange={onChange('password')}
            required
          />
          <p className="field-hint">8자 이상, 대문자/소문자/숫자/특수문자를 각각 포함해야 합니다.</p>
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={form.passwordConfirm}
            onChange={onChange('passwordConfirm')}
            required
          />
          <input
            placeholder="이름"
            value={form.name}
            onChange={onChange('name')}
            required
          />
          <select value={form.gender} onChange={onChange('gender')} required>
            <option value="MALE">남성</option>
            <option value="FEMALE">여성</option>
          </select>
          <input
            type="date"
            placeholder="생년월일 (YYYY-MM-DD)"
            value={form.birth_date}
            onChange={onChange('birth_date')}
            required
          />
          <input
            placeholder="휴대폰번호 (예: 01012345678)"
            value={form.phone_number}
            onChange={onChange('phone_number')}
            required
          />
          <p className="field-hint">허용 형식: 01012345678, 010-1234-5678, +821012345678</p>
          <button type="submit" className="save-btn" disabled={isSubmitting}>
            {isSubmitting ? '가입 중...' : '회원가입 완료'}
          </button>
        </form>
        {error && <p className="status">{error}</p>}
        <Link to="/auth/login" className="link-inline">
          로그인으로 이동
        </Link>
      </article>
    </section>
  );
}
