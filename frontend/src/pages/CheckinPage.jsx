import { useEffect, useState } from 'react';
import { healthRecordApi } from '../api/healthRecordApi.js';

const sliderRules = {
  water_ml: { min: 0, max: 5000, step: 10, label: '수분 섭취량', unit: 'ml' },
  steps: { min: 0, max: 50000, step: 1, label: '걸음 수', unit: '걸음' },
  exercise_minutes: { min: 0, max: 180, step: 5, label: '운동 시간', unit: '분' },
};

export default function CheckinPage() {
  const [form, setForm] = useState({ water_ml: 0, steps: 0, exercise_minutes: 0 });
  const [message, setMessage] = useState('');

  useEffect(() => {
    healthRecordApi.getToday().then((res) => setForm(res)).catch(() => undefined);
  }, []);

  const onChange = (name) => (e) => setForm((prev) => ({ ...prev, [name]: Number(e.target.value) }));

  const onSave = async () => {
    try {
      const saved = await healthRecordApi.saveToday(form);
      setForm(saved);
      setMessage('저장 완료: 오늘 누적값으로 반영되었습니다.');
    } catch (err) {
      setMessage(err?.response?.data?.detail || '저장 실패: 토큰/입력값을 확인하세요.');
    }
  };

  return (
    <section className="stack">
      <article className="card">
        <h2>체크인</h2>
        <p className="muted">같은 날 여러 번 저장하면 누적됩니다.</p>
      </article>

      {Object.entries(sliderRules).map(([name, rule]) => (
        <article className="card" key={name}>
          <div className="card-head">
            <strong>{rule.label}</strong>
            <strong className="green">
              {form[name]} {rule.unit}
            </strong>
          </div>
          <input
            type="range"
            min={rule.min}
            max={rule.max}
            step={rule.step}
            value={form[name]}
            onChange={onChange(name)}
            className="slider"
          />
          <p className="muted small">
            {rule.min} ~ {rule.max} (step {rule.step})
          </p>
        </article>
      ))}

      <button type="button" className="save-btn" onClick={onSave}>
        저장하기
      </button>
      {message && <p className="status">{message}</p>}
    </section>
  );
}
