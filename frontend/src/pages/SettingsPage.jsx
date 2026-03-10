import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { clearCurrentUserEmail } from '../utils/onboardingGate.js';

const METRIC_META = {
  water_ml: { label: '수분섭취', max: 5000, unit: 'ml' },
  steps: { label: '걸음수', max: 30000, unit: '걸음' },
  exercise_minutes: { label: '운동시간', max: 180, unit: '분' },
};
const NOTI_PREF_KEY = 'notification_preferences';
const DEFAULT_NOTI_PREFS = {
  risk_alert: true,
  checkin_reminder: true,
  weekly_summary: true,
};

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
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [notiPrefs, setNotiPrefs] = useState(() => {
    try {
      return { ...DEFAULT_NOTI_PREFS, ...(JSON.parse(localStorage.getItem(NOTI_PREF_KEY) || '{}')) };
    } catch {
      return DEFAULT_NOTI_PREFS;
    }
  });

  useEffect(() => {
    apiClient
      .get('/v1/users/me/profile-overview')
      .then((res) => setProfile(res.data))
      .catch((err) => setError(err?.response?.data?.detail || '프로필 정보를 불러오지 못했습니다.'));
  }, []);

  const onLogout = () => {
    const confirmed = window.confirm('로그아웃하시겠습니까?');
    if (!confirmed) return;
    localStorage.removeItem('access_token');
    clearCurrentUserEmail();
    navigate('/auth/login', { replace: true });
  };

  const openPasswordModal = () => {
    setIsPwModalOpen(true);
    setOldPassword('');
    setIsOldPasswordVerified(false);
    setNewPassword('');
    setNewPasswordConfirm('');
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

  const bmi = profile?.bmi ?? 0;
  const bmiPct = Math.min(100, Math.max(0, ((bmi - 15) / 20) * 100));
  const isPasswordMatch = newPasswordConfirm.length > 0 && newPassword === newPasswordConfirm;
  const isPasswordMismatch = newPasswordConfirm.length > 0 && newPassword !== newPasswordConfirm;
  const toggleNotiPref = (field) => {
    const next = { ...notiPrefs, [field]: !notiPrefs[field] };
    setNotiPrefs(next);
    localStorage.setItem(NOTI_PREF_KEY, JSON.stringify(next));
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
          <Link to="/notifications" className="pill-btn">
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

        <article className="card">
        <h3>BMI 분석</h3>
        <p className="bmi-value">{profile?.bmi ? profile.bmi.toFixed(1) : '-'}</p>
        <div className="rainbow-scale">
          <div className="rainbow-marker" style={{ left: `${bmiPct}%` }} />
        </div>
        <p className="muted">Blue → Red 스케일</p>
        </article>

        <article className="card">
        <h3>기록 히스토리 (7일)</h3>
        {Object.entries(METRIC_META).map(([key, meta]) => (
          <div key={key} className="metric-group">
            <p className="muted">{meta.label}</p>
            <MiniLineChart
              data={profile?.history_7d || []}
              getValue={(p) => p[key]}
              maxValue={meta.max}
              lineColor="#2f9dff"
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
            <h3>비밀번호 변경</h3>
            <p className="muted">현재 비밀번호를 먼저 확인하세요.</p>

            <label htmlFor="old-password" className="small">현재 비밀번호</label>
            <div className="modal-inline">
              <input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={isOldPasswordVerified}
                placeholder="현재 비밀번호"
              />
              <button
                type="button"
                className="pill-btn"
                onClick={onVerifyCurrentPassword}
                disabled={pwLoading || oldPassword.length < 8 || isOldPasswordVerified}
              >
                확인
              </button>
            </div>

            {isOldPasswordVerified && (
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

            {pwError && <p className="status">{pwError}</p>}
            {pwSuccess && <p className="status green">{pwSuccess}</p>}

            <div className="modal-actions">
              <button type="button" className="danger-outline-btn" onClick={closePasswordModal} disabled={pwLoading}>
                취소
              </button>
              <button
                type="button"
                className="save-btn"
                onClick={onSubmitPasswordChange}
                disabled={pwLoading || !isOldPasswordVerified || !isPasswordMatch}
              >
                변경 저장
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
