import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import {
  clearCurrentUserEmail,
  getCurrentUserEmail,
  getOnboardingBmiSnapshot,
  saveOnboardingBmiSnapshot,
} from '../utils/onboardingGate.js';

const METRIC_META = {
  water_ml: { label: '수분섭취', max: 5000, unit: 'ml', lineColor: '#2f9dff' },
  steps: { label: '걸음수', max: 30000, unit: '걸음', lineColor: '#2ca867' },
  exercise_minutes: { label: '운동시간', max: 180, unit: '분', lineColor: '#f29f3f' },
};
const NOTI_PREF_KEY = 'notification_preferences';
const DEFAULT_NOTI_PREFS = {
  risk_alert: true,
  checkin_reminder: true,
  weekly_summary: true,
};
const WEIGHT_OVERRIDE_PREFIX = 'profile_weight_override:';

function toShortDate(dateText) {
  return dateText?.slice(5) || '';
}

function MiniLineChart({
  data,
  getValue,
  maxValue,
  lineColor = '#44a7ff',
  pointColor,
  formatTitle,
}) {
  if (!data.length) {
    return <p className="muted">표시할 데이터가 없습니다.</p>;
  }

  const width = 100;
  const height = 60;
  const pad = 6;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const values = data.map((item) => Math.max(0, Number(getValue(item) || 0)));
  const max = maxValue > 0 ? maxValue : Math.max(...values, 1);
  const denom = Math.max(data.length - 1, 1);

  const points = values.map((value, idx) => {
    const x = pad + (idx / denom) * innerW;
    const ratio = Math.min(1, value / max);
    const y = pad + (1 - ratio) * innerH;
    return { x, y, value, raw: data[idx] };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="mini-line-wrap">
      <svg
        className="mini-line-chart"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line x1={pad} y1={pad} x2={width - pad} y2={pad} className="mini-line-guide" />
        <line x1={pad} y1={height / 2} x2={width - pad} y2={height / 2} className="mini-line-guide" />
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} className="mini-line-guide" />
        <polyline points={polyline} className="mini-line-path" style={{ stroke: lineColor }} />
        {points.map((p, idx) => (
          <circle
            key={`${idx}-${p.raw.date}`}
            cx={p.x}
            cy={p.y}
            r="1.8"
            style={{ fill: pointColor ? pointColor(p.value, p.raw) : lineColor }}
          >
            <title>{formatTitle ? formatTitle(p.value, p.raw) : String(p.value)}</title>
          </circle>
        ))}
      </svg>
      <div className="mini-line-labels">
        {data.map((p) => (
          <span key={p.date}>{toShortDate(p.date)}</span>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [isPwModalOpen, setIsPwModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [isOldPasswordVerified, setIsOldPasswordVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [weightOverride, setWeightOverride] = useState(null);
  const [bmiSnapshot, setBmiSnapshot] = useState(null);
  const [notiPrefs, setNotiPrefs] = useState(() => {
    try {
      return { ...DEFAULT_NOTI_PREFS, ...(JSON.parse(localStorage.getItem(NOTI_PREF_KEY) || '{}')) };
    } catch {
      return DEFAULT_NOTI_PREFS;
    }
  });

  useEffect(() => {
    let cancelled = false;
    const syncBmiSnapshot = (nextProfile) => {
      const email = nextProfile?.email || getCurrentUserEmail();
      const h = Number(nextProfile?.latest_height_cm || 0);
      const w = Number(nextProfile?.latest_weight_kg || 0);
      const bmi = Number(nextProfile?.bmi || 0);
      if (email && h > 0 && w > 0 && bmi > 0) {
        saveOnboardingBmiSnapshot(email, { height_cm: h, weight_kg: w, bmi });
      }
    };

    const loadProfile = async () => {
      const fillFromLatestOnboarding = async (baseProfile = {}) => {
        try {
          const latestRes = await apiClient.get('/v1/onboarding/latest');
          const latest = latestRes.data || {};
          const hasOnboarding = Boolean(latest?.has_onboarding);
          const h = Number(latest?.height_cm || 0);
          const w = Number(latest?.weight_kg || 0);
          const bmi = Number(latest?.bmi || 0);
          const merged = {
            ...baseProfile,
            onboarding_completed: hasOnboarding || Boolean(baseProfile?.onboarding_completed),
            latest_height_cm: h > 0 ? h : (baseProfile?.latest_height_cm ?? null),
            latest_weight_kg: w > 0 ? w : (baseProfile?.latest_weight_kg ?? null),
            bmi: bmi > 0 ? bmi : (baseProfile?.bmi ?? null),
          };
          if (!cancelled) {
            setProfile(merged);
          }
          syncBmiSnapshot(merged);
        } catch {
          // ignore latest-onboarding fallback errors
        }
      };

      try {
        const res = await apiClient.get('/v1/users/me/profile-overview');
        if (cancelled) return;
        const nextProfile = res.data;
        setProfile(nextProfile);
        syncBmiSnapshot(nextProfile);
        if (!nextProfile?.bmi || !nextProfile?.latest_height_cm || !nextProfile?.latest_weight_kg) {
          await fillFromLatestOnboarding(nextProfile);
        }
        setError('');
        return;
      } catch (err) {
        const overviewError = err;
        try {
          const meRes = await apiClient.get('/v1/users/me');
          if (cancelled) return;
          const me = meRes.data || {};
          setProfile({
            ...me,
            onboarding_completed: false,
            bmi: null,
            latest_height_cm: null,
            latest_weight_kg: null,
            history_7d: [],
            risk_trend_7d: [],
          });
          await fillFromLatestOnboarding({
            ...me,
            onboarding_completed: false,
            bmi: null,
            latest_height_cm: null,
            latest_weight_kg: null,
            history_7d: [],
            risk_trend_7d: [],
          });
          setError(
            overviewError?.response?.data?.detail
              || '프로필 일부 정보를 불러오지 못했습니다. 기본 정보만 표시합니다.',
          );
          return;
        } catch {
          if (cancelled) return;
          setError(overviewError?.response?.data?.detail || '프로필 정보를 불러오지 못했습니다.');
        }
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const email = profile?.email || getCurrentUserEmail();
    setBmiSnapshot(getOnboardingBmiSnapshot(email));
    if (!email) {
      setWeightOverride(null);
      return;
    }
    const stored = Number(localStorage.getItem(`${WEIGHT_OVERRIDE_PREFIX}${email.toLowerCase()}`));
    if (Number.isFinite(stored) && stored > 20 && stored <= 300) {
      setWeightOverride(stored);
      return;
    }
    setWeightOverride(null);
  }, [profile?.email]);

  const onLogout = () => {
    const confirmed = window.confirm('로그아웃하시겠습니까?');
    if (!confirmed) return;
    sessionStorage.removeItem('access_token');
    clearCurrentUserEmail();
    navigate('/auth/login', { replace: true });
  };

  const openPasswordModal = () => {
    setIsPwModalOpen(true);
    setOldPassword('');
    setIsOldPasswordVerified(false);
    setNewPassword('');
    setNewPasswordConfirm('');
    setNewNickname(profile?.name || '');
    setEditTarget('');
    setPwError('');
    setPwSuccess('');
  };

  const closePasswordModal = () => {
    setIsPwModalOpen(false);
    setPwLoading(false);
  };

  const onVerifyCurrentPassword = async () => {
    setPwError('');
    setPwSuccess('');
    setPwLoading(true);
    try {
      await apiClient.post('/v1/users/me/password/verify', { old_password: oldPassword });
      setIsOldPasswordVerified(true);
      setPwSuccess('현재 비밀번호가 확인되었습니다.');
    } catch (err) {
      setIsOldPasswordVerified(false);
      setPwError(err?.response?.data?.detail || '현재 비밀번호 확인 실패');
    } finally {
      setPwLoading(false);
    }
  };

  const onSubmitPasswordChange = async () => {
    if (!isOldPasswordVerified) return;
    if (!newPassword || !newPasswordConfirm) {
      setPwError('새 비밀번호와 비밀번호 확인을 모두 입력하세요.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPwError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setPwError('');
    setPwSuccess('');
    setPwLoading(true);
    try {
      await apiClient.patch('/v1/users/me/password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPwSuccess('비밀번호가 변경되었습니다.');
      setTimeout(() => {
        closePasswordModal();
      }, 500);
    } catch (err) {
      setPwError(err?.response?.data?.detail || '비밀번호 변경 실패');
    } finally {
      setPwLoading(false);
    }
  };

  const onSubmitNicknameChange = async () => {
    if (!isOldPasswordVerified) return;
    const trimmed = (newNickname || '').trim();
    if (trimmed.length < 2) {
      setPwError('닉네임은 2자 이상 입력하세요.');
      return;
    }
    if (trimmed.length > 20) {
      setPwError('닉네임은 20자 이하로 입력하세요.');
      return;
    }
    if (trimmed === (profile?.name || '')) {
      setPwError('기존 닉네임과 동일합니다.');
      return;
    }

    setPwError('');
    setPwSuccess('');
    setPwLoading(true);
    try {
      const response = await apiClient.patch('/v1/users/me', { name: trimmed });
      setProfile((prev) => ({ ...prev, ...(response.data || {}), name: trimmed }));
      setPwSuccess('닉네임이 변경되었습니다.');
      setTimeout(() => {
        closePasswordModal();
      }, 500);
    } catch (err) {
      setPwError(err?.response?.data?.detail || '닉네임 변경 실패');
    } finally {
      setPwLoading(false);
    }
  };

  const onWithdraw = async () => {
    const confirmed = window.confirm('회원탈퇴 시 모든 정보가 삭제됩니다. 계속하시겠습니까?');
    if (!confirmed) return;
    const checkText = window.prompt("안내를 확인했다면 '확인했습니다.'를 정확히 입력하세요.");
    if (checkText !== '확인했습니다.') {
      window.alert("문구가 일치하지 않아 취소되었습니다.");
      return;
    }

    try {
      await apiClient.delete('/v1/users/me');
      localStorage.clear();
      window.location.replace('/auth/login');
    } catch (err) {
      window.alert(err?.response?.data?.detail || '회원탈퇴 처리에 실패했습니다.');
    }
  };

  const latestHeightCm = Number(profile?.latest_height_cm || bmiSnapshot?.height_cm || 0);
  const effectiveWeightKg = weightOverride ?? Number(profile?.latest_weight_kg || bmiSnapshot?.weight_kg || 0);
  const calculatedBmi = latestHeightCm > 0 && effectiveWeightKg > 0
    ? effectiveWeightKg / (((latestHeightCm / 100) ** 2) + 1e-9)
    : null;
  const bmi = calculatedBmi ?? Number(profile?.bmi || bmiSnapshot?.bmi || 0);
  const BMI_SCALE_MIN = 15;
  const BMI_SCALE_MAX = 35;
  const bmiPct = Math.min(100, Math.max(0, ((bmi - BMI_SCALE_MIN) / (BMI_SCALE_MAX - BMI_SCALE_MIN)) * 100));
  const bmiStatus = bmi <= 0
    ? { label: 'BMI 정보가 없습니다.', tone: '' }
    : bmi >= 30
      ? { label: '고도비만', tone: 'red' }
      : bmi >= 25
        ? { label: '비만', tone: 'orange' }
        : bmi >= 23
          ? { label: '과체중', tone: 'yellow' }
          : bmi >= 18.5
            ? { label: '정상', tone: 'green' }
            : { label: '저체중', tone: '' };
  const isPasswordMatch = newPasswordConfirm.length > 0 && newPassword === newPasswordConfirm;
  const isPasswordMismatch = newPasswordConfirm.length > 0 && newPassword !== newPasswordConfirm;
  const toggleNotiPref = (field) => {
    const next = { ...notiPrefs, [field]: !notiPrefs[field] };
    setNotiPrefs(next);
    localStorage.setItem(NOTI_PREF_KEY, JSON.stringify(next));
  };
  const openWeightModal = () => {
    const currentWeight = effectiveWeightKg || Number(profile?.latest_weight_kg || 0);
    setWeightInput(currentWeight ? String(currentWeight) : '');
    setIsWeightModalOpen(true);
  };
  const closeWeightModal = () => {
    setIsWeightModalOpen(false);
  };
  const onSubmitWeight = () => {
    const parsed = Number(weightInput);
    if (!Number.isFinite(parsed) || parsed <= 20 || parsed > 300) return;
    const email = profile?.email || getCurrentUserEmail();
    if (email) {
      localStorage.setItem(`${WEIGHT_OVERRIDE_PREFIX}${email.toLowerCase()}`, String(parsed));
    }
    setWeightOverride(parsed);
    setIsWeightModalOpen(false);
  };

  return (
    <>
      <section className="stack">
        <article className="card">
        <div className="profile-row">
          <div className="profile-avatar">👤</div>
          <div>
            <h2>{profile?.name || '사용자'}</h2>
            <p className="muted">{profile?.email || '이메일 정보 없음'}</p>
          </div>
        </div>
        <button type="button" className="pill-btn full-width" onClick={openPasswordModal}>
          회원정보 수정
        </button>
        </article>

        <article className="card">
        <div className="card-head">
          <h3>알림 설정</h3>
          <Link to="/notifications" className="pill-btn noti-center-btn">
            알림 센터
          </Link>
        </div>
        <div className="setting-list">
          <div className="setting-row">
            <div>
              <strong>위험도 알림</strong>
              <p className="muted">위험도 상승 시 즉시 알림을 보냅니다.</p>
            </div>
            <button
              type="button"
              className={`toggle-btn ${notiPrefs.risk_alert ? 'on' : 'off'}`}
              onClick={() => toggleNotiPref('risk_alert')}
            >
              {notiPrefs.risk_alert ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="setting-row">
            <div>
              <strong>체크인 리마인드</strong>
              <p className="muted">오늘 기록이 없으면 리마인드합니다.</p>
            </div>
            <button
              type="button"
              className={`toggle-btn ${notiPrefs.checkin_reminder ? 'on' : 'off'}`}
              onClick={() => toggleNotiPref('checkin_reminder')}
            >
              {notiPrefs.checkin_reminder ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="setting-row">
            <div>
              <strong>주간 요약 알림</strong>
              <p className="muted">일주일 건강 요약 알림을 받습니다.</p>
            </div>
            <button
              type="button"
              className={`toggle-btn ${notiPrefs.weekly_summary ? 'on' : 'off'}`}
              onClick={() => toggleNotiPref('weekly_summary')}
            >
              {notiPrefs.weekly_summary ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
        </article>

        <article className="card bmi-card">
        <div className="card-head">
          <h3>BMI 분석</h3>
          <button type="button" className="pill-btn noti-center-btn" onClick={openWeightModal}>
            몸무게 입력
          </button>
        </div>
        <div className="bmi-status-row">
          <p className="bmi-value">{bmi > 0 ? bmi.toFixed(1) : '-'}</p>
          <span className={`bmi-status-chip ${bmiStatus.tone}`}>{bmiStatus.label}</span>
        </div>
        <div className="rainbow-scale">
          <div className="rainbow-marker" style={{ left: `${bmiPct}%` }} />
        </div>
        </article>

        <article className="card">
        <h3>기록 히스토리</h3>
        {Object.entries(METRIC_META).map(([key, meta]) => (
          <div key={key} className="metric-group">
            <p className="muted">{meta.label}</p>
            <MiniLineChart
              data={profile?.history_7d || []}
              getValue={(p) => p[key]}
              maxValue={meta.max}
              lineColor={meta.lineColor}
              formatTitle={(v) => `${v} ${meta.unit}`}
            />
          </div>
        ))}
        </article>

        <article className="card">
        {profile?.is_admin && (
          <button type="button" className="pill-btn full-width" onClick={() => navigate('/admin/users')}>
            관리자 회원 목록 보기
          </button>
        )}
        <button type="button" className="danger-btn" onClick={onLogout}>
          로그아웃
        </button>
        <button type="button" className="danger-outline-btn" onClick={onWithdraw}>
          회원탈퇴
        </button>
        {error && <p className="status">{error}</p>}
        </article>
      </section>

      {isPwModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closePasswordModal}>
          <section className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>회원정보 수정</h3>

            {!isOldPasswordVerified && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (pwLoading || oldPassword.length < 8) return;
                  onVerifyCurrentPassword();
                }}
              >
                <label htmlFor="old-password" className="small">현재 비밀번호</label>
                <div className="modal-inline">
                  <input
                    id="old-password"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="현재 비밀번호"
                  />
                  <button
                    type="submit"
                    className="pill-btn"
                    disabled={pwLoading || oldPassword.length < 8}
                  >
                    확인
                  </button>
                </div>
              </form>
            )}

            {isOldPasswordVerified && (
              <>
                <div className="tab-chip-row profile-edit-choice-row">
                  <button
                    type="button"
                    className={`tab-chip profile-edit-choice-chip ${editTarget === 'password' ? 'active' : ''}`}
                    onClick={() => {
                      setEditTarget('password');
                      setPwError('');
                      setPwSuccess('');
                    }}
                  >
                    비밀번호 변경
                  </button>
                  <button
                    type="button"
                    className={`tab-chip profile-edit-choice-chip ${editTarget === 'nickname' ? 'active' : ''}`}
                    onClick={() => {
                      setEditTarget('nickname');
                      setPwError('');
                      setPwSuccess('');
                    }}
                  >
                    닉네임 변경
                  </button>
                </div>

                {editTarget === 'password' && (
                  <>
                    <label htmlFor="new-password" className="small">새 비밀번호</label>
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="새 비밀번호"
                    />
                    <label htmlFor="new-password-confirm" className="small">새 비밀번호 확인</label>
                    <input
                      id="new-password-confirm"
                      type="password"
                      value={newPasswordConfirm}
                      onChange={(e) => setNewPasswordConfirm(e.target.value)}
                      placeholder="새 비밀번호 확인"
                    />
                    {isPasswordMatch && <p className="status green">새 비밀번호가 일치합니다.</p>}
                    {isPasswordMismatch && <p className="status orange">새 비밀번호가 일치하지 않습니다.</p>}
                  </>
                )}

                {editTarget === 'nickname' && (
                  <>
                    <label htmlFor="new-nickname" className="small">새 닉네임</label>
                    <input
                      id="new-nickname"
                      type="text"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      placeholder="새 닉네임(2~20자)"
                      maxLength={20}
                    />
                  </>
                )}
              </>
            )}

            {pwError && <p className="status">{pwError}</p>}
            {pwSuccess && <p className="status green">{pwSuccess}</p>}

            <div className="modal-actions">
              <button type="button" className="danger-outline-btn" onClick={closePasswordModal} disabled={pwLoading}>
                취소
              </button>
              <button
                type="button"
                className="save-btn"
                onClick={editTarget === 'nickname' ? onSubmitNicknameChange : onSubmitPasswordChange}
                disabled={
                  pwLoading
                  || !isOldPasswordVerified
                  || !editTarget
                  || (editTarget === 'password' && !isPasswordMatch)
                  || (editTarget === 'nickname' && (newNickname || '').trim().length < 2)
                }
              >
                {editTarget === 'nickname' ? '닉네임 저장' : '변경 저장'}
              </button>
            </div>
          </section>
        </div>
      )}

      {isWeightModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={closeWeightModal}>
          <section className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3 className="weight-modal-title">몸무게 입력</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!Number.isFinite(Number(weightInput)) || Number(weightInput) <= 20 || Number(weightInput) > 300) return;
                onSubmitWeight();
              }}
            >
              <label htmlFor="weight-input" className="small">몸무게(kg)</label>
              <input
                id="weight-input"
                type="number"
                min="20"
                max="300"
                step="0.1"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="예: 68.5"
              />
              <div className="modal-actions weight-modal-actions">
                <button type="button" className="danger-outline-btn weight-modal-btn" onClick={closeWeightModal}>
                  취소
                </button>
                <button
                  type="submit"
                  className="save-btn weight-modal-btn"
                  disabled={!Number.isFinite(Number(weightInput)) || Number(weightInput) <= 20 || Number(weightInput) > 300}
                >
                  다음
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
