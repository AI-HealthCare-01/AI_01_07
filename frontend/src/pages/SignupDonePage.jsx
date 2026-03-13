import { Link } from 'react-router-dom';

export default function SignupDonePage() {
  return (
    <section className="auth-wrap">
      <article className="auth-card center">
        <h1>가입 완료</h1>
        <Link to="/auth/login" className="save-btn center">
          로그인으로 이동
        </Link>
      </article>
    </section>
  );
}
