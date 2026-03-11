import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications.js';
import { getCurrentUserEmail } from '../../utils/onboardingGate.js';

const links = [
  { to: '/home', label: '홈' },
  { to: '/checkin', label: '체크인' },
  { to: '/challenge', label: '챌린지' },
  { to: '/food', label: '식단' },
  { to: '/profile', label: '프로필' },
];

export default function WebAppLayout() {
  const navigate = useNavigate();
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const { unreadNotifications, unreadCount, markNotificationRead, markAllRead } = useNotifications();
  const email = getCurrentUserEmail();
  const avatarLabel = useMemo(() => (email ? email.charAt(0).toUpperCase() : 'D'), [email]);
  const previewNotifications = unreadNotifications.slice(0, 5);

  return (
    <div className="web-shell">
      <aside className="web-sidebar">
        <div className="web-brand">
          <span className="brand-icon">∞</span>
          <strong>귀귀코코</strong>
        </div>
        <nav className="web-nav" aria-label="main">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `web-nav-link ${isActive ? 'active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="web-content">
        <header className="web-header">
          <h1>AI Health Dashboard</h1>
          <div className="header-actions">
            <button
              type="button"
              className="icon-badge"
              onClick={() => setIsNotiOpen((prev) => !prev)}
              aria-expanded={isNotiOpen}
              aria-controls="web-notification-panel"
            >
              알림
              {unreadCount > 0 && <span className="noti-dot">{unreadCount}</span>}
            </button>
            <button type="button" className="avatar-btn" onClick={() => navigate('/profile')}>
              {avatarLabel}
            </button>
          </div>
          {isNotiOpen && (
            <section id="web-notification-panel" className="noti-panel web-noti-panel" aria-label="알림 내역">
              <div className="noti-panel-head">
                <strong>알림 내역</strong>
                <div className="noti-actions">
                  <button
                    type="button"
                    className="noti-close-btn"
                    onClick={() => {
                      setIsNotiOpen(false);
                      navigate('/notifications');
                    }}
                  >
                    전체보기
                  </button>
                  <button type="button" className="noti-read-all-btn" onClick={markAllRead}>
                    모두 읽음
                  </button>
                  <button type="button" className="noti-close-btn" onClick={() => setIsNotiOpen(false)}>
                    닫기
                  </button>
                </div>
              </div>
              <ul className="noti-list">
                {previewNotifications.length === 0 ? (
                  <li className="noti-item info">
                    <strong>새 알림이 없습니다.</strong>
                  </li>
                ) : (
                  previewNotifications.map((item) => (
                    <li key={item.key} className={`noti-item ${item.level}`}>
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                      <button type="button" className="noti-mark-btn" onClick={() => markNotificationRead(item.key)}>
                        읽음
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </section>
          )}
        </header>
        <main className="web-main">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
