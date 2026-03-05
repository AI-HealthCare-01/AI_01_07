import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/home', label: '홈' },
  { to: '/checkin', label: '체크인' },
  { to: '/challenge', label: '챌린지' },
  { to: '/food', label: '식단' },
  { to: '/settings', label: '설정' },
];

export default function MobileAppLayout() {
  return (
    <div className="mobile-wrap">
      <header className="mobile-header">
        <div className="brand-group">
          <span className="brand-icon">∞</span>
          <strong>귀귀코코</strong>
        </div>
        <div className="header-actions">
          <button type="button" className="icon-badge">
            알림
          </button>
          <button type="button" className="avatar-btn">
            데
          </button>
        </div>
      </header>
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
