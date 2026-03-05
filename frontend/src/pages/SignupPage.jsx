import { Link } from 'react-router-dom';

export default function SignupPage() {
  return (
    <section className="auth-wrap">
      <article className="auth-card">
        <h1>회원가입</h1>
        <div className="form-stack">
          <input placeholder="email" />
          <input placeholder="인증번호 입력" />
          <input placeholder="비밀번호" type="password" />
          <input placeholder="비밀번호 재확인" type="password" />
          <input placeholder="닉네임" />
          <input placeholder="생년월일 (YYYY-MM-DD)" />
        </div>
        <Link to="/auth/signup/sent" className="save-btn center">
          회원가입 완료
        </Link>
      </article>
    </section>
  );
}
