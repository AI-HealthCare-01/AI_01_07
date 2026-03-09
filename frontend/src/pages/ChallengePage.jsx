export default function ChallengePage() {
  return (
    <section className="stack">
      <article className="card">
        <div className="card-head">
          <h2>챌린지</h2>
          <button type="button" className="pill-btn">
            + 새로 만들기
          </button>
        </div>
        <p className="muted">빠르게 시작할 수 있는 챌린지를 선택하세요.</p>
      </article>

      {[
        '매일 10,000보 걷기',
        '하루 2L 물 마시기',
        '30분 운동 챌린지',
        '7시간 수면 챌린지',
      ].map((item) => (
        <article className="card list-row" key={item}>
          <div>
            <strong>{item}</strong>
            <p className="muted">매일 실천형 챌린지</p>
          </div>
          <button type="button" className="pill-btn">
            추가
          </button>
        </article>
      ))}
    </section>
  );
}
