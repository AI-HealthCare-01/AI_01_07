import { useMemo, useState } from "react";
import "./App.css";
import {
  submitOnboardingSurvey,
  type OnboardingPredictionResponse,
  type OnboardingSurveyRequest,
} from "./api/onboarding";

type Screen = "start" | "form" | "loading" | "result";

const TOTAL_QUESTIONS = 12;

const INITIAL_FORM: OnboardingSurveyRequest = {
  age: 30,
  gender: "male",
  height_cm: 170,
  weight_kg: 70,
  family_history: "no",
  hypertension: "no",
  hyperlipidemia: "no",
  smoking_status: "never",
  drinking_freq: "rarely",
  exercise_days_30m: "d3_4",
  sugary_drink_freq: "sometimes",
  late_night_meal_freq: "sometimes",
  post_meal_walk: "sometimes",
};

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

function stageLabel(stage: OnboardingPredictionResponse["risk_stage"]): string {
  if (stage === "normal") return "정상군";
  if (stage === "borderline") return "경계군";
  return "고위험군";
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [form, setForm] = useState<OnboardingSurveyRequest>(INITIAL_FORM);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OnboardingPredictionResponse | null>(null);

  const bmi = useMemo(() => {
    const h = form.height_cm / 100;
    return form.weight_kg / (h * h + 1e-9);
  }, [form.height_cm, form.weight_kg]);

  const progress = useMemo(() => {
    let answered = 0;
    if (form.age > 0) answered += 1;
    if (form.gender) answered += 1;
    if (form.height_cm > 0 && form.weight_kg > 0) answered += 1;
    if (form.family_history) answered += 1;
    if (form.hypertension) answered += 1;
    if (form.hyperlipidemia) answered += 1;
    if (form.smoking_status) answered += 1;
    if (form.drinking_freq) answered += 1;
    if (form.exercise_days_30m) answered += 1;
    if (form.sugary_drink_freq) answered += 1;
    if (form.late_night_meal_freq) answered += 1;
    if (form.post_meal_walk) answered += 1;
    return Math.round((answered / TOTAL_QUESTIONS) * 100);
  }, [form]);

  async function onSubmit(): Promise<void> {
    setError("");
    setScreen("loading");
    try {
      const data = await submitOnboardingSurvey(form);
      setResult(data);
      setScreen("result");
    } catch (e) {
      setScreen("form");
      setError(e instanceof Error ? e.message : "제출 중 오류가 발생했습니다.");
    }
  }

  return (
    <div className="page">
      {screen === "start" && (
        <section className="panel">
          <h1>건강 설문</h1>
          <p className="subtitle">최초 1회 필수</p>
          <div className="card">
            <p>설문을 완료하면 당뇨 위험도를 예측해드립니다.</p>
            <p>약 2~3분 소요됩니다.</p>
          </div>
          <button className="primary" onClick={() => setScreen("form")}>
            설문 시작하기
          </button>
        </section>
      )}

      {screen === "form" && (
        <section className="panel">
          <h1>설문 작성</h1>
          <div className="progressWrap">
            <div className="progressBar" style={{ width: `${progress}%` }} />
          </div>
          <p className="subtitle">진행도 {progress}%</p>

          {error && <div className="error">{error}</div>}

          <div className="formGrid">
            <label>
              1. 나이
              <input
                type="number"
                value={form.age}
                onChange={(e) => setForm((prev) => ({ ...prev, age: Number(e.target.value) }))}
              />
            </label>

            <label>
              2. 성별
              <select value={form.gender} onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value as OnboardingSurveyRequest["gender"] }))}>
                <option value="male">남성</option>
                <option value="female">여성</option>
              </select>
            </label>

            <label>
              3. 키(cm)
              <input
                type="number"
                value={form.height_cm}
                onChange={(e) => setForm((prev) => ({ ...prev, height_cm: Number(e.target.value) }))}
              />
            </label>
            <label>
              3. 몸무게(kg)
              <input
                type="number"
                value={form.weight_kg}
                onChange={(e) => setForm((prev) => ({ ...prev, weight_kg: Number(e.target.value) }))}
              />
            </label>

            <div className="bmiBox">BMI 자동 계산: {bmi.toFixed(1)}</div>

            <label>
              4. 가족력
              <select value={form.family_history} onChange={(e) => setForm((prev) => ({ ...prev, family_history: e.target.value as OnboardingSurveyRequest["family_history"] }))}>
                <option value="yes">네</option>
                <option value="no">아니오</option>
                <option value="unknown">잘 모르겠습니다</option>
              </select>
            </label>

            <label>
              5. 고혈압 진단/복용
              <select value={form.hypertension} onChange={(e) => setForm((prev) => ({ ...prev, hypertension: e.target.value as OnboardingSurveyRequest["hypertension"] }))}>
                <option value="yes">네</option>
                <option value="no">아니오</option>
              </select>
            </label>

            <label>
              6. 고지혈증 진단/복용
              <select value={form.hyperlipidemia} onChange={(e) => setForm((prev) => ({ ...prev, hyperlipidemia: e.target.value as OnboardingSurveyRequest["hyperlipidemia"] }))}>
                <option value="yes">네</option>
                <option value="no">아니오</option>
              </select>
            </label>

            <label>
              7. 흡연 상태
              <select value={form.smoking_status} onChange={(e) => setForm((prev) => ({ ...prev, smoking_status: e.target.value as OnboardingSurveyRequest["smoking_status"] }))}>
                <option value="never">비흡연</option>
                <option value="former">과거 흡연(금연)</option>
                <option value="current">현재 흡연</option>
              </select>
            </label>

            <label>
              8. 음주 빈도
              <select value={form.drinking_freq} onChange={(e) => setForm((prev) => ({ ...prev, drinking_freq: e.target.value as OnboardingSurveyRequest["drinking_freq"] }))}>
                <option value="rarely">거의 마시지 않음</option>
                <option value="week_1_2">주 1~2회</option>
                <option value="week_3_plus">주 3회 이상</option>
              </select>
            </label>

            <label>
              9. 최근 한 달 운동(주 30분 이상)
              <select value={form.exercise_days_30m} onChange={(e) => setForm((prev) => ({ ...prev, exercise_days_30m: e.target.value as OnboardingSurveyRequest["exercise_days_30m"] }))}>
                <option value="d0">0일</option>
                <option value="d1_2">1~2일</option>
                <option value="d3_4">3~4일</option>
                <option value="d5_plus">5일 이상</option>
              </select>
            </label>

            <label>
              10. 당음료 빈도
              <select value={form.sugary_drink_freq} onChange={(e) => setForm((prev) => ({ ...prev, sugary_drink_freq: e.target.value as OnboardingSurveyRequest["sugary_drink_freq"] }))}>
                <option value="rarely">거의 안 마심</option>
                <option value="sometimes">가끔</option>
                <option value="often">자주</option>
              </select>
            </label>

            <label>
              11. 야식 빈도 (밤 10시 이후)
              <select value={form.late_night_meal_freq} onChange={(e) => setForm((prev) => ({ ...prev, late_night_meal_freq: e.target.value as OnboardingSurveyRequest["late_night_meal_freq"] }))}>
                <option value="rarely">거의 안 먹음</option>
                <option value="sometimes">가끔</option>
                <option value="often">자주</option>
              </select>
            </label>

            <label>
              12. 식후 10분 이상 걷기
              <select value={form.post_meal_walk} onChange={(e) => setForm((prev) => ({ ...prev, post_meal_walk: e.target.value as OnboardingSurveyRequest["post_meal_walk"] }))}>
                <option value="always">매 식사 후 걷는다</option>
                <option value="sometimes">가끔 걷는다</option>
                <option value="never">바로 앉거나 눕는다</option>
              </select>
            </label>
          </div>

          <button className="primary" onClick={onSubmit}>
            제출하기
          </button>
        </section>
      )}

      {screen === "loading" && (
        <section className="panel center">
          <h1>분석 중</h1>
          <p className="subtitle">모델이 설문을 분석하고 있어요…</p>
          <div className="loader" />
        </section>
      )}

      {screen === "result" && result && (
        <section className="panel">
          <h1>예측 결과</h1>
          <div className="resultBox">
            <div className="stage">{stageLabel(result.risk_stage)}</div>
            <div className="prob">위험 확률: {pct(result.risk_probability)}</div>
            <p>{result.message}</p>
          </div>

          <h2>추천 행동</h2>
          <ul className="actions">
            {result.recommended_actions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <p className="notice">※ 의료 진단을 대체하지 않습니다.</p>
          <div className="buttonRow">
            <button className="secondary" onClick={() => setScreen("form")}>
              다시 설문하기
            </button>
            <button className="primary" onClick={() => setScreen("start")}>
              처음으로
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
