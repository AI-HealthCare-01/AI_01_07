import { useCallback, useEffect, useRef, useState } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const PASTEL_COLORS = ['#FFD6A5', '#BDE0FE', '#CDEAC0'];

export default function FoodPage() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultData, setResultData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [menuInput, setMenuInput] = useState('');
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [todayData, setTodayData] = useState(null);
  const [todayLoading, setTodayLoading] = useState(false);
  const [recordEditMode, setRecordEditMode] = useState(false);
  const [deletingMealId, setDeletingMealId] = useState(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function onPickFile(nextFile) {
    setFile(nextFile);
    setError('');
    setResultData(null);
    setEditing(false);
    setReanalyzeError('');
    setSaveError('');

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (nextFile) {
      setPreviewUrl(URL.createObjectURL(nextFile));
      return;
    }

    setPreviewUrl('');
  }

  function authHeader() {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  const loadTodayMeals = useCallback(async () => {
    setTodayLoading(true);
    try {
      const res = await fetch('/api/v1/meals/today', {
        headers: {
          ...authHeader(),
        },
      });
      if (!res.ok) {
        const text = await res.text();
        window.alert(text || '오늘 식단 기록을 불러오지 못했습니다.');
        return;
      }
      const data = await res.json();
      setTodayData(data);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '오늘 식단 기록 조회 중 오류가 발생했습니다.');
    } finally {
      setTodayLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodayMeals();
  }, [loadTodayMeals]);

  async function submit() {
    if (!file) return;

    setError('');
    setSaveError('');
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/v1/food/analyze', { method: 'POST', body: fd });
      if (!res.ok) {
        const text = await res.text();
        setError(text || '분석 요청에 실패했습니다.');
        return;
      }

      const data = await res.json();
      setResultData(data);
      setMenuInput(data?.chosen?.name_ko || data?.chosen?.label || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function reanalyzeMenu() {
    const menuName = menuInput.trim();
    if (!menuName) {
      setReanalyzeError('메뉴명을 입력해주세요.');
      return;
    }

    setReanalyzeError('');
    setReanalyzing(true);

    try {
      const res = await fetch('/api/v1/food/reanalyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu_name: menuName }),
      });

      if (!res.ok) {
        const text = await res.text();
        setReanalyzeError(text || '재분석에 실패했습니다.');
        return;
      }

      const next = await res.json();
      setResultData(next);
      setEditing(false);
    } catch (e) {
      setReanalyzeError(e instanceof Error ? e.message : '재분석 중 오류가 발생했습니다.');
    } finally {
      setReanalyzing(false);
    }
  }

  async function saveFood() {
    if (!resultData?.nutrition) return;

    setSaveError('');
    setSaving(true);

    try {
      const res = await fetch('/api/v1/meals/from_analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
        body: JSON.stringify({
          menu_label: resultData.chosen.name_ko ?? resultData.chosen.label,
          kcal: resultData.nutrition.kcal,
          carb_g: resultData.nutrition.carb_g,
          protein_g: resultData.nutrition.protein_g,
          fat_g: resultData.nutrition.fat_g,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setSaveError(text || '저장에 실패했습니다.');
        return;
      }

      const payload = await res.json();
      setTodayData(payload.today);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteMeal(mealId) {
    setDeletingMealId(mealId);

    try {
      const res = await fetch(`/api/v1/meals/${mealId}`, {
        method: 'DELETE',
        headers: {
          ...authHeader(),
        },
      });

      if (!res.ok) {
        const text = await res.text();
        window.alert(text || '식단 기록 삭제에 실패했습니다.');
        return;
      }

      const nextToday = await res.json();
      setTodayData(nextToday);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '식단 기록 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingMealId(null);
    }
  }

  const chartData = resultData?.macro_ratio_kcal
    ? [
        { name: '탄수화물', value: resultData.macro_ratio_kcal.carb_pct },
        { name: '단백질', value: resultData.macro_ratio_kcal.protein_pct },
        { name: '지방', value: resultData.macro_ratio_kcal.fat_pct },
      ]
    : [];

  const recommendationMeta = resultData?.recommendation?.warning
    ? {
        title: '식단 체크',
        guide: '다음 끼니에서 한두 가지만 먼저 보완해 보세요. 기록을 이어가면 변화가 더 잘 보여요.',
      }
    : {
        title: '식단 체크',
        guide: '현재 식사 흐름은 안정적이에요. 지금처럼 균형을 유지해 보세요.',
      };

  const formattedRecommendationMessage = resultData?.recommendation?.message
    ? resultData.recommendation.message
        .replace(
          /(벗어났어요|편차가 있어요)\s*\((.*?)\)\./,
          (_, prefix, details) => {
            const compactDetails = details
              .split(', ')
              .map((item) => item.replace(/(.+?)\(([-+]?\d+(?:\.\d+)?%p?)\)/, '$1 $2').replace(/%p/g, '%'))
              .join(' · ');
            return `${prefix}.\n${compactDetails}`;
          },
        )
        .replace(/다음 끼니에서 아래 항목을 우선 보완해\s*보세요\./, '\n다음 끼니에서 아래 항목을 우선 보완해보세요.')
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)
        .join('\n')
    : '';

  const formattedRecommendationGuide = recommendationMeta.guide
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .join('\n');

  function renderBoldNumbers(text) {
    return text.split(/(\d+(?:\.\d+)?%p?)/g).map((part, index) => {
      if (/^\d+(?:\.\d+)?%p?$/.test(part)) {
        return <strong key={`num-${index}`}>{part}</strong>;
      }
      return <span key={`txt-${index}`}>{part}</span>;
    });
  }

  const todayTitle = todayData?.date_label ? `오늘 식단 기록 (${todayData.date_label})` : '오늘 식단 기록';
  const summaryCards = todayData?.summary
    ? [
        { label: '칼로리', value: `${todayData.summary.total_kcal} kcal` },
        { label: '탄수화물', value: `${todayData.summary.total_carb_g}g` },
        { label: '단백질', value: `${todayData.summary.total_protein_g}g` },
        { label: '지방', value: `${todayData.summary.total_fat_g}g` },
      ]
    : [];

  return (
    <section className="stack">
      <article className="card food-card">
        <div className="card-head">
          <div>
            <strong>식단 분석</strong>
            <p className="food-subtitle">사진 한 장으로 음식 분석과 영양소 비율을 확인합니다.</p>
          </div>
          {resultData?.source && (
            <span className="pill-btn">{resultData.source === 'db' ? '영양 DB' : 'AI 추정'}</span>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="food-file-input"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
        />

        <button
          type="button"
          className="food-upload-trigger"
          onClick={() => inputRef.current?.click()}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="업로드한 음식 사진 미리보기" className="food-preview-image" />
          ) : (
            <div className="food-upload-placeholder">
              <strong>사진 클릭 또는 업로드</strong>
              <span>카메라 촬영 또는 앨범에서 음식 사진을 선택하세요.</span>
            </div>
          )}
        </button>

        <div className="food-upload-meta">
          <span>{file ? '사진 선택 완료' : '선택된 파일 없음'}</span>
          {file && (
            <button type="button" className="pill-btn" onClick={() => onPickFile(null)}>
              다시 선택
            </button>
          )}
        </div>

        <button type="button" className="save-btn full-width" onClick={submit} disabled={!file || loading}>
          {loading ? '분석 중...' : '분석 시작'}
        </button>

        {error && <div className="error">{error}</div>}
      </article>

      {resultData && (
        <>
          <article className="card food-card">
            <strong>분석 결과</strong>
            <p className="food-subtitle">
              Top-3: {resultData.top3.map((item) => `${item.label}(${Math.round(item.confidence * 100)}%)`).join(', ')}
            </p>

            <div className="food-result-title">
              <div>
                <h3>{resultData.chosen.name_ko ?? resultData.chosen.label}</h3>
                <p className="food-subtitle">모델이 가장 가능성이 높다고 본 메뉴입니다.</p>
              </div>
              <button type="button" className="pill-btn" onClick={() => setEditing((prev) => !prev)}>
                {editing ? '수정 닫기' : '메뉴 수정'}
              </button>
            </div>

            {editing && (
              <div className="food-edit-card">
                <label htmlFor="menu-name-input">메뉴명 수정</label>
                <input
                  id="menu-name-input"
                  type="text"
                  value={menuInput}
                  onChange={(e) => setMenuInput(e.target.value)}
                  placeholder="예: 김치볶음밥, 비빔밥"
                />
                <button type="button" className="save-btn full-width" onClick={reanalyzeMenu} disabled={reanalyzing}>
                  {reanalyzing ? '재분석 중...' : '재분석 적용'}
                </button>
                {reanalyzeError && <div className="error">{reanalyzeError}</div>}
              </div>
            )}

            {!resultData.nutrition && (
              <div className="food-empty-state">
                영양 매핑이 아직 없습니다. 영양 DB에 메뉴를 추가하면 비율 차트가 바로 표시됩니다.
              </div>
            )}

            {resultData.nutrition && resultData.macro_ratio_kcal && (
              <>
                <div className="food-macro-summary">
                  <div>
                    <span>칼로리</span>
                    <strong>{resultData.nutrition.kcal} kcal</strong>
                  </div>
                  <div>
                    <span>탄수화물</span>
                    <strong>{resultData.nutrition.carb_g}g</strong>
                  </div>
                  <div>
                    <span>단백질</span>
                    <strong>{resultData.nutrition.protein_g}g</strong>
                  </div>
                  <div>
                    <span>지방</span>
                    <strong>{resultData.nutrition.fat_g}g</strong>
                  </div>
                </div>

                <div className="food-chart-wrap">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie dataKey="value" data={chartData} innerRadius={58} outerRadius={88} paddingAngle={3}>
                        {chartData.map((entry, index) => (
                          <Cell key={entry.name} fill={PASTEL_COLORS[index % PASTEL_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="food-ratio-grid">
                  {chartData.map((item, index) => (
                    <div key={item.name} className="food-ratio-item">
                      <span className="food-ratio-dot" style={{ background: PASTEL_COLORS[index % PASTEL_COLORS.length] }} />
                      <span>{item.name}</span>
                      <strong>{item.value}%</strong>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className={`food-recommend-card ${resultData.recommendation.warning ? 'warning' : 'ok'}`}>
              <div className="food-recommend-head">
                <strong>{recommendationMeta.title}</strong>
                <span>{formattedRecommendationGuide}</span>
              </div>
              <p className="food-recommend-message">
                {formattedRecommendationMessage
                  .split('\n')
                  .filter(Boolean)
                  .map((line, index) => (
                    <span key={`line-${index}`} className="food-recommend-line">
                      {renderBoldNumbers(line)}
                    </span>
                  ))}
              </p>
              {resultData.recommendation.suggestions.length > 0 && (
                <div className="food-suggestion-list">
                  {resultData.recommendation.suggestions.map((item) => (
                    <span key={item} className="food-hashtag">#{item.replace(/\s+/g, '')}</span>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="save-btn full-width"
              onClick={saveFood}
              disabled={saving || !resultData.nutrition}
            >
              {saving ? '저장 중...' : '오늘 식단으로 저장'}
            </button>
            {!resultData.nutrition && (
              <p className="food-subtitle">영양소 정보가 없어 저장할 수 없습니다. 메뉴 수정 후 재분석해 주세요.</p>
            )}
            {saveError && <div className="error">{saveError}</div>}
          </article>

        </>
      )}

      <article className="card">
        <div className="card-head">
          <strong>{todayTitle}</strong>
          <strong>{todayData?.summary?.total_kcal ?? 0} kcal</strong>
        </div>
        {todayLoading && <p className="food-subtitle">불러오는 중...</p>}

        {!todayLoading && todayData && (
          <>
            <div className={`food-carb-guide ${todayData.carb_pct > 65 ? 'warn' : todayData.carb_pct < 55 ? 'info' : 'ok'}`}>
              <strong>탄수화물 비율 {todayData.carb_pct}%</strong>
              <p>{todayData.message}</p>
            </div>

            <div className="food-today-summary">
              <div className="food-today-summary-head">
                <span>누적 합계</span>
                <button
                  type="button"
                  className={`food-edit-toggle ${recordEditMode ? 'active' : ''}`}
                  onClick={() => setRecordEditMode((prev) => !prev)}
                >
                  {recordEditMode ? '수정 완료' : '기록 수정'}
                </button>
              </div>
              <div className="food-today-summary-grid">
                {summaryCards.map((item) => (
                  <div key={item.label} className="food-today-summary-card">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="food-table-wrap">
              <table className="food-table">
                <thead>
                  <tr>
                    <th>시간</th>
                    <th>메뉴</th>
                    <th>kal</th>
                    {recordEditMode && <th>관리</th>}
                  </tr>
                </thead>
                <tbody>
                  {todayData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={recordEditMode ? 4 : 3}>오늘 날짜 기준 저장된 식단이 없습니다.</td>
                    </tr>
                  ) : (
                    todayData.rows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          {new Date(row.created_at).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                            timeZone: 'Asia/Seoul',
                          })}
                        </td>
                        <td>{row.menu_label ?? '-'}</td>
                        <td>{row.kcal ?? 0}</td>
                        {recordEditMode && (
                          <td>
                            <button
                              type="button"
                              className="food-delete-btn"
                              onClick={() => deleteMeal(row.id)}
                              disabled={deletingMealId === row.id}
                            >
                              {deletingMealId === row.id ? '삭제 중...' : '삭제'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </article>
    </section>
  );
}
