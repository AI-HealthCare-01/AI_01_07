import { Link } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home' },
  { to: '/health-record', label: 'Health Record' },
];

export default function AppShell({ children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <h1 className="brand">AI Health</h1>
        <nav className="nav-menu" aria-label="main">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="nav-link">
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="page-content">{children}</main>
    </div>
  );
}
