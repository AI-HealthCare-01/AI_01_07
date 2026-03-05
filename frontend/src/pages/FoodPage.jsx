export default function FoodPage() {
  return (
    <section className="stack">
      <article className="card">
        <h2>식단 분석</h2>
        <p className="muted">사진 업로드/검색 입력 기반 분석 화면</p>
        <div className="upload-box">사진 클릭 또는 드래그 업로드</div>
      </article>

      <article className="card">
        <div className="card-head">
          <strong>오늘의 식단 기록</strong>
          <strong className="orange">총 0 kcal</strong>
        </div>
        <p className="muted">오늘 기록된 식단이 없습니다.</p>
      </article>
    </section>
  );
}
