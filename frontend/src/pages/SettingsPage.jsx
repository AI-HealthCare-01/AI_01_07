export default function SettingsPage() {
  const token = localStorage.getItem('access_token') || '';

  return (
    <section className="stack">
      <article className="profile-card">
        <h2>데모</h2>
        <p>demo@example.com</p>
      </article>

      <article className="card">
        <h3>BMI 분석</h3>
        <p className="bmi-value">39.1</p>
        <p className="muted">비만 범위</p>
      </article>

      <article className="card">
        <h3>현재 토큰 상태</h3>
        <p className="muted">{token ? 'access_token 저장됨' : '토큰 없음 (로그인 필요)'}</p>
      </article>
    </section>
  );
}
