import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { apiClient } from '../../api/client.js';
import { healthRecordApi } from '../../api/healthRecordApi.js';
import { getCurrentUserEmail, hasCompletedOnboarding } from '../../utils/onboardingGate.js';

const READ_NOTI_KEY = 'read_notifications';

const tabs = [
  { to: '/home', label: '홈' },
  { to: '/checkin', label: '체크인' },
  { to: '/challenge', label: '챌린지' },
  { to: '/food', label: '식단' },
  { to: '/profile', label: '프로필' },
];

export default function MobileAppLayout() {
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const [riskValue, setRiskValue] = useState(null);
  const [today, setToday] = useState({ water_ml: 0, steps: 0, exercise_minutes: 0 });
  const [swipeXMap, setSwipeXMap] = useState({});
  const touchStartRef = useRef({});
  const [readMap, setReadMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(READ_NOTI_KEY) || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    apiClient
      .get('/v1/users/me/profile-overview')
      .then((res) => {
        const trend = res.data?.risk_trend_7d || [];
        const latest = trend.at(-1);
        setRiskValue(latest ? Math.round((latest.risk_probability || 0) * 100) : null);
      })
      .catch(() => setRiskValue(null));

    healthRecordApi
      .getToday()
      .then((res) => setToday(res))
      .catch(() => setToday({ water_ml: 0, steps: 0, exercise_minutes: 0 }));
  }, []);

  const notifications = useMemo(() => {
    const items = [];
    const email = getCurrentUserEmail();
    const onboardingDone = hasCompletedOnboarding(email);

    items.push({
      id: 'onboarding',
      title: onboardingDone ? '설문이 완료되었습니다.' : '설문이 아직 완료되지 않았습니다.',
      body: onboardingDone ? '홈에서 위험도 추이를 확인할 수 있어요.' : '설문을 완료하면 개인 맞춤 분석을 볼 수 있어요.',
      level: onboardingDone ? 'success' : 'warn',
    });

    if (riskValue !== null) {
      items.push({
        id: 'risk',
        title: `최신 위험도 ${riskValue}%`,
        body: '홈 화면에서 7일 추이를 확인하세요.',
        level: riskValue >= 70 ? 'danger' : riskValue >= 40 ? 'warn' : 'info',
      });
    }

    items.push({
      id: 'checkin',
      title: `오늘 체크인 ${today.water_ml}ml · ${today.steps}걸음 · ${today.exercise_minutes}분`,
      body: '체크인 페이지에서 오늘 기록을 업데이트할 수 있어요.',
      level: 'info',
    });

    return items.map((item) => {
      const key = `${item.id}:${item.title}`;
      return { ...item, key, isRead: Boolean(readMap[key]) };
    });
  }, [riskValue, today, readMap]);

  const unreadNotifications = notifications.filter((item) => !item.isRead);
  const unreadCount = unreadNotifications.length;

  const markNotificationRead = (key) => {
    const next = { ...readMap, [key]: true };
    setReadMap(next);
    localStorage.setItem(READ_NOTI_KEY, JSON.stringify(next));
    setSwipeXMap((prev) => {
      const copied = { ...prev };
      delete copied[key];
      return copied;
    });
  };

  const markAllRead = () => {
    const next = { ...readMap };
    notifications.forEach((item) => {
      next[item.key] = true;
    });
    setReadMap(next);
    localStorage.setItem(READ_NOTI_KEY, JSON.stringify(next));
    setSwipeXMap({});
  };

  const onNotiTouchStart = (key) => (e) => {
    const t = e.touches[0];
    touchStartRef.current[key] = { x: t.clientX, y: t.clientY };
  };

  const onNotiTouchMove = (key) => (e) => {
    const start = touchStartRef.current[key];
    if (!start) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dy) > Math.abs(dx)) return;
    const clamped = Math.max(0, Math.min(140, dx));
    setSwipeXMap((prev) => ({ ...prev, [key]: clamped }));
  };

  const onNotiTouchEnd = (key) => () => {
    const moved = swipeXMap[key] || 0;
    delete touchStartRef.current[key];
    if (moved >= 80) {
      markNotificationRead(key);
      return;
    }
    setSwipeXMap((prev) => ({ ...prev, [key]: 0 }));
  };

  const onNotiTouchCancel = (key) => () => {
    delete touchStartRef.current[key];
    setSwipeXMap((prev) => ({ ...prev, [key]: 0 }));
  };

  return (
    <div className="mobile-wrap">
      <header className="mobile-header">
        <div className="brand-group">
          <span className="brand-icon">∞</span>
          <strong>귀귀코코</strong>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="icon-badge"
            onClick={() => setIsNotiOpen((prev) => !prev)}
            aria-expanded={isNotiOpen}
            aria-controls="header-notification-panel"
          >
            알림
            {unreadCount > 0 && <span className="noti-dot">{unreadCount}</span>}
          </button>
          <button type="button" className="avatar-btn">
            데
          </button>
        </div>
      </header>
      {isNotiOpen && (
        <section id="header-notification-panel" className="noti-panel" aria-label="알림 내역">
          <div className="noti-panel-head">
            <strong>알림 내역</strong>
            <div className="noti-actions">
              <button type="button" className="noti-read-all-btn" onClick={markAllRead}>
                모두 읽음
              </button>
              <button type="button" className="noti-close-btn" onClick={() => setIsNotiOpen(false)}>
                닫기
              </button>
            </div>
          </div>
          <ul className="noti-list">
            {unreadNotifications.length === 0 ? (
              <li className="noti-item info">
                <strong>새 알림이 없습니다.</strong>
              </li>
            ) : (
              unreadNotifications.map((item) => (
                <li
                  key={item.key}
                  className={`noti-item ${item.level}`}
                  onTouchStart={onNotiTouchStart(item.key)}
                  onTouchMove={onNotiTouchMove(item.key)}
                  onTouchEnd={onNotiTouchEnd(item.key)}
                  onTouchCancel={onNotiTouchCancel(item.key)}
                  style={{
                    transform: `translateX(${swipeXMap[item.key] || 0}px)`,
                    opacity: 1 - Math.min((swipeXMap[item.key] || 0) / 220, 0.45),
                  }}
                >
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      )}
      <main className="mobile-main">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="main">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
