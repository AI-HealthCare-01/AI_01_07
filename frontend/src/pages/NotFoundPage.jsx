import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="auth-wrap">
      <article className="auth-card center">
      <h2>404</h2>
      <p>요청한 페이지를 찾을 수 없습니다.</p>
      <Link to="/home" className="save-btn center">
        홈으로 이동
      </Link>
      </article>
    </section>
  );
}
