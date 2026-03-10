import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingApi } from '../api/onboardingApi.js';
import { getCurrentUserEmail, hasCompletedOnboarding, syncOnboardingCompleted } from '../utils/onboardingGate.js';

export default function SurveyPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    age: 30,
    gender: 'male',
    height_cm: 170,
    weight_kg: 70,
    family_history: 'no',
    hypertension: 'no',
    hyperlipidemia: 'no',
    smoking_status: 'never',
    drinking_freq: 'rarely',
    exercise_days_30m: 'd3_4',
    sugary_drink_freq: 'sometimes',
    late_night_meal_freq: 'sometimes',
    post_meal_walk: 'sometimes',
  });

  const onChange = (name) => (e) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    navigate('/survey/loading', { state: { form } });
  };

  useEffect(() => {
    const email = getCurrentUserEmail();
    if (hasCompletedOnboarding(email)) {
      navigate('/home', { replace: true });
      return;
    }

    onboardingApi
      .hasCompleted()
      .then((completed) => {
        if (completed) {
          if (email) {
            syncOnboardingCompleted(email);
          }
          navigate('/home', { replace: true });
        }
      })
      .catch(() => {
        // Ignore network errors and keep survey accessible.
      });
  }, [navigate]);

  return (
    <section className="auth-wrap">
      <article className="auth-card">
        <h1>건강 위험도 설문</h1>
        <p>설문 결과를 기반으로 당뇨 위험도를 예측합니다.</p>
        <form className="form-stack" onSubmit={onSubmit}>
          <label>
            나이
            <input type="number" value={form.age} onChange={onChange('age')} />
          </label>
          <label>
            성별
            <select value={form.gender} onChange={onChange('gender')}>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </label>
          <label>
            키(cm)
            <input type="number" value={form.height_cm} onChange={onChange('height_cm')} />
          </label>
          <label>
            몸무게(kg)
            <input type="number" value={form.weight_kg} onChange={onChange('weight_kg')} />
          </label>
          <label>
            가족력
            <select value={form.family_history} onChange={onChange('family_history')}>
              <option value="yes">네</option>
              <option value="no">아니오</option>
              <option value="unknown">잘 모르겠습니다</option>
            </select>
          </label>
          <label>
            고혈압 진단/복용
            <select value={form.hypertension} onChange={onChange('hypertension')}>
              <option value="yes">네</option>
              <option value="no">아니오</option>
            </select>
          </label>
          <label>
            고지혈증 진단/복용
            <select value={form.hyperlipidemia} onChange={onChange('hyperlipidemia')}>
              <option value="yes">네</option>
              <option value="no">아니오</option>
            </select>
          </label>
          <label>
            흡연 상태
            <select value={form.smoking_status} onChange={onChange('smoking_status')}>
              <option value="never">비흡연</option>
              <option value="former">과거 흡연(금연)</option>
              <option value="current">현재 흡연</option>
            </select>
          </label>
          <label>
            음주 빈도
            <select value={form.drinking_freq} onChange={onChange('drinking_freq')}>
              <option value="rarely">거의 마시지 않음</option>
              <option value="week_1_2">주 1~2회</option>
              <option value="week_3_plus">주 3회 이상</option>
            </select>
          </label>
          <label>
            최근 한 달 운동(주 30분 이상)
            <select value={form.exercise_days_30m} onChange={onChange('exercise_days_30m')}>
              <option value="d0">0일</option>
              <option value="d1_2">1~2일</option>
              <option value="d3_4">3~4일</option>
              <option value="d5_plus">5일 이상</option>
            </select>
          </label>
          <label>
            당음료 빈도
            <select value={form.sugary_drink_freq} onChange={onChange('sugary_drink_freq')}>
              <option value="rarely">거의 안 마심</option>
              <option value="sometimes">가끔</option>
              <option value="often">자주</option>
            </select>
          </label>
          <label>
            야식 빈도 (밤 10시 이후)
            <select value={form.late_night_meal_freq} onChange={onChange('late_night_meal_freq')}>
              <option value="rarely">거의 안 먹음</option>
              <option value="sometimes">가끔</option>
              <option value="often">자주</option>
            </select>
          </label>
          <label>
            식후 10분 이상 걷기
            <select value={form.post_meal_walk} onChange={onChange('post_meal_walk')}>
              <option value="always">매 식사 후 걷는다</option>
              <option value="sometimes">가끔 걷는다</option>
              <option value="never">바로 앉거나 눕는다</option>
            </select>
          </label>
          <button type="submit" className="save-btn center">
            제출하기
          </button>
        </form>
      </article>
    </section>
  );
}
