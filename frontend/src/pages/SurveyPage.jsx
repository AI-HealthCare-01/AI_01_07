import { Link } from 'react-router-dom';

export default function SurveyPage() {
  return (
    <section className="auth-wrap">
      <article className="auth-card">
        <h1>건강 위험도 설문</h1>
        <p>스크린샷 기반 UI 흐름용 샘플 페이지입니다.</p>
        <div className="form-stack">
          <label>
            나이
            <input type="number" defaultValue={55} />
          </label>
          <label>
            성별
            <select defaultValue="MALE">
              <option value="MALE">남성</option>
              <option value="FEMALE">여성</option>
            </select>
          </label>
        </div>
        <Link to="/survey/loading" className="save-btn center">
          제출하기
        </Link>
      </article>
    </section>
  );
}
