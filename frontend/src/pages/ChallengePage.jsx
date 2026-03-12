import { useEffect, useMemo, useState } from 'react';
import {
  checkUserChallenge,
  createUserChallenge,
  getChallengeTemplates,
  getTodayChallenge,
  getUserChallenges,
} from '../api/challengeApi.js';
import {
  loadActiveChallenges,
  loadChallengeTargetOverrides,
  saveActiveChallenge,
  saveChallengeTargetOverride,
} from '../utils/challengeSelection.js';

function progressPercent(value, target) {
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

export default function ChallengePage() {
  const [todayData, setTodayData] = useState(null);
  const [activeTab, setActiveTab] = useState('today');
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [targetOverrides, setTargetOverrides] = useState({});
  const [userChallenges, setUserChallenges] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTemplateKeys, setSelectedTemplateKeys] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function refreshUserChallenges() {
    return getUserChallenges()
      .then((data) => setUserChallenges(data))
      .catch(() => setUserChallenges([]));
  }

  useEffect(() => {
    getTodayChallenge()
      .then((data) => setTodayData(data))
      .catch(() => setTodayData(null));

    setActiveChallenges(loadActiveChallenges());
    setTargetOverrides(loadChallengeTargetOverrides());
    refreshUserChallenges();
  }, []);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => setToastMessage(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const challengeItems = useMemo(() => {
    const row = todayData?.row;
    return [
      {
        icon: '💧',
        title: '물 마시기',
        current: row?.water_cups ?? 0,
        target: targetOverrides['물 마시기'] ?? 8,
        unit: '컵',
      },
      {
        icon: '🚶',
        title: '걷기 운동',
        current: row?.steps ?? 0,
        target: targetOverrides['걷기 운동'] ?? 8000,
        unit: '보',
      },
      {
        icon: '🏃',
        title: '운동',
        current: row?.exercise_minutes ?? 0,
        target: targetOverrides.운동 ?? 30,
        unit: '분',
      },
      {
        icon: '🛌',
        title: '수면시간',
        current: row?.sleep_hours ?? 0,
        target: targetOverrides.수면시간 ?? 8,
        unit: '시간',
      },
      {
        icon: '🌙',
        title: '야식 금지',
        current: row?.no_snack ? 1 : 0,
        target: targetOverrides['야식 금지'] ?? 1,
        unit: '달성',
      },
    ];
  }, [todayData, targetOverrides]);

  const todayChallenge = useMemo(() => {
    const sorted = [...challengeItems].sort(
      (a, b) => progressPercent(a.current, a.target) - progressPercent(b.current, b.target),
    );
    return sorted[0];
  }, [challengeItems]);

  const todayProgress = todayChallenge ? progressPercent(todayChallenge.current, todayChallenge.target) : 0;
  const visibleActiveChallenges = activeChallenges.map((item) => ({
    ...item,
    target: targetOverrides[item.title] ?? item.target,
  }));
  const selectedCount = selectedTemplateKeys.length;

  function startChallenge() {
    if (todayChallenge) {
      const nextChallenge = {
        ...todayChallenge,
        progress: todayProgress,
      };
      saveActiveChallenge(nextChallenge);
      setActiveChallenges(loadActiveChallenges());
      setActiveTab('active');
    }
  }

  async function openCreateModal() {
    setIsCreateModalOpen(true);
    if (templates.length > 0) return;
    try {
      const data = await getChallengeTemplates();
      setTemplates(data);
    } catch {
      setTemplates([]);
    }
  }

  async function handleAddTemplate() {
    if (selectedTemplateKeys.length === 0) return;
    setIsSubmitting(true);
    try {
      const results = await Promise.allSettled(
        selectedTemplateKeys.map((templateKey) => createUserChallenge({ template_key: templateKey })),
      );
      const successCount = results.filter((item) => item.status === 'fulfilled').length;
      const duplicateCount = results.filter(
        (item) => item.status === 'rejected' && item.reason?.response?.data?.detail === 'challenge already added',
      ).length;
      await refreshUserChallenges();
      if (successCount > 0 && duplicateCount > 0) {
        setToastMessage(`${successCount}개 추가, ${duplicateCount}개는 이미 있었어요.`);
      } else if (successCount > 0) {
        setToastMessage(`${successCount}개 챌린지가 추가됐어요.`);
      } else {
        setToastMessage('이미 추가한 챌린지예요.');
      }
      setSelectedTemplateKeys([]);
      setIsCreateModalOpen(false);
      setActiveTab('active');
    } catch {
      window.alert('챌린지를 추가하지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleTemplateSelection(templateKey) {
    setSelectedTemplateKeys((prev) =>
      prev.includes(templateKey) ? prev.filter((item) => item !== templateKey) : [...prev, templateKey],
    );
  }

  function editChallengeTarget(item) {
    const nextValue = window.prompt(`${item.title} 목표를 입력하세요.`, String(item.target));
    if (nextValue == null) return;

    const parsed = Number(nextValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      window.alert('0보다 큰 숫자를 입력해 주세요.');
      return;
    }

    const nextOverrides = saveChallengeTargetOverride(item.title, parsed);
    setTargetOverrides(nextOverrides);
    setActiveChallenges(loadActiveChallenges());
  }

  async function toggleUserChallenge(item) {
    const nextDone = !item.today_done;
    try {
      const updated = await checkUserChallenge(item.id, { done: nextDone });
      setUserChallenges((prev) =>
        prev.map((challenge) =>
          challenge.id === item.id
            ? {
                ...challenge,
                today_done: updated.today_done,
                streak: updated.streak,
              }
            : challenge,
        ),
      );
      setToastMessage(nextDone ? '오늘 기록 저장됨' : '오늘 기록이 해제됐어요.');
    } catch {
      window.alert('오늘 기록을 저장하지 못했어요.');
    }
  }

  return (
    <section className="stack">
      <article className="card challenge-list-card">
        <div className="card-head">
          <div>
            <strong>챌린지</strong>
            <p className="food-subtitle">매일 자동 선정된 오늘의 챌린지를 확인하세요.</p>
          </div>
          <div className="challenge-tab-row">
            <button
              type="button"
              className={`challenge-tab ${activeTab === 'today' ? 'active' : ''}`}
              onClick={() => setActiveTab('today')}
            >
              오늘
            </button>
            <button
              type="button"
              className={`challenge-tab ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              진행중
            </button>
          </div>
        </div>

        {activeTab === 'today' ? (
          <>
            <div className="challenge-focus-card">
              <strong>오늘의 건강 챌린지 (00:00 자동 선정)</strong>
              {todayChallenge && (
                <>
                  <p className="challenge-focus-title">
                    {todayChallenge.icon} {todayChallenge.title}
                  </p>
                  <div className="challenge-progress-track">
                    <div className="challenge-progress-bar" style={{ width: `${todayProgress}%` }} />
                  </div>
                  <p className="muted small">
                    진행도 {todayProgress}% / 목표 {todayChallenge.target}
                    {todayChallenge.unit}
                  </p>
                </>
              )}
            </div>

            <button type="button" className="save-btn challenge-link-btn" onClick={startChallenge}>
              도전하기
            </button>
          </>
        ) : (
          <>
            <div className="challenge-active-list">
              <strong>진행중 챌린지</strong>
              {visibleActiveChallenges.length === 0 ? (
                <p className="muted">아직 진행중인 챌린지가 없습니다.</p>
              ) : (
                visibleActiveChallenges.map((item) => (
                  <article key={item.title} className="challenge-week-item active">
                    <div>
                      <strong>
                        {item.icon} {item.title}
                      </strong>
                      <p className="muted small">
                        현재 {item.current}
                        {item.unit} / 목표 {item.target}
                        {item.unit}
                      </p>
                    </div>
                    <span className="challenge-active-badge">진행중</span>
                  </article>
                ))
              )}
            </div>

            <div className="challenge-active-list">
              <strong>내 챌린지</strong>
              {userChallenges.length === 0 ? (
                <p className="muted">아직 추가한 체크형 챌린지가 없습니다.</p>
              ) : (
                userChallenges.map((item) => (
                  <article
                    key={item.id}
                    className={`challenge-week-item challenge-check-item ${item.today_done ? 'done' : ''}`}
                  >
                    <label className="challenge-check-label">
                      <input
                        type="checkbox"
                        checked={item.today_done}
                        onChange={() => toggleUserChallenge(item)}
                      />
                      <span className="challenge-check-copy">
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>
                      </span>
                    </label>
                    <div className="challenge-item-actions">
                      {item.streak > 0 && <span className="challenge-streak-badge">🔥 {item.streak}일 연속</span>}
                    </div>
                  </article>
                ))
              )}
            </div>
          </>
        )}

        <div className="challenge-weekly-list">
          <strong>이번 주 챌린지</strong>
          {challengeItems.slice(0, 4).map((item) => (
            <article
              key={item.title}
              className={`challenge-week-item ${progressPercent(item.current, item.target) >= 100 ? 'done' : ''}`}
            >
              <div>
                <strong>
                  {item.icon} {item.title}
                </strong>
                <p className="muted small">
                  {item.current}
                  {item.unit} / 목표 {item.target}
                  {item.unit}
                </p>
              </div>
              <div className="challenge-item-actions">
                {progressPercent(item.current, item.target) >= 100 && (
                  <span className="challenge-done-badge">목표 달성</span>
                )}
                <button type="button" className="challenge-item-arrow-btn" onClick={() => editChallengeTarget(item)}>
                  <span className="challenge-item-arrow">›</span>
                </button>
              </div>
            </article>
          ))}
        </div>

        {toastMessage && <p className="status green challenge-toast">{toastMessage}</p>}

        <button type="button" className="pill-btn challenge-manage-btn" onClick={openCreateModal}>
          + 새로 만들기
        </button>
      </article>

      {isCreateModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => {
            setIsCreateModalOpen(false);
            setSelectedTemplateKeys([]);
          }}
        >
          <section className="modal-card challenge-template-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>새 챌린지 추가</h3>
            <p className="muted">오늘부터 체크만 하면 되는 간단 챌린지예요.</p>
            <p className="muted small">여러 개를 골라서 한 번에 추가할 수 있어요.</p>

            <div className="challenge-template-list">
              {templates.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`challenge-template-item ${selectedTemplateKeys.includes(item.key) ? 'selected' : ''}`}
                  onClick={() => toggleTemplateSelection(item.key)}
                >
                  <span className="challenge-template-check" aria-hidden="true">
                    {selectedTemplateKeys.includes(item.key) ? '✓' : ''}
                  </span>
                  <span className="challenge-template-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="challenge-template-copy">
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                    <small>{item.reminder_hint}</small>
                  </span>
                </button>
              ))}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="danger-outline-btn"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setSelectedTemplateKeys([]);
                }}
                disabled={isSubmitting}
              >
                닫기
              </button>
              <button type="button" className="save-btn" onClick={handleAddTemplate} disabled={isSubmitting || selectedCount === 0}>
                {selectedCount > 0 ? `${selectedCount}개 추가하기` : '추가하기'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
