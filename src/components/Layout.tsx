import { useState, type ReactNode } from 'react';
import logo from '../assets/logo.jpeg';
import { NAV, PAGE_TITLES, type Lang, type PageKey } from '../nav';

const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

export function Layout({
  children, current, onNavigate, onLogout, lang, onToggleLang, userName,
}: {
  children: ReactNode;
  current: PageKey;
  onNavigate: (k: PageKey) => void;
  onLogout: () => void;
  lang: Lang;
  onToggleLang: () => void;
  userName?: string;
}) {
  const [collapsed, setCollapsed] = useState(false); // desktop: icon-only sidebar
  const [mobileOpen, setMobileOpen] = useState(false); // mobile: slide-in sidebar

  const toggle = () => (isMobile() ? setMobileOpen((o) => !o) : setCollapsed((c) => !c));
  const go = (k: PageKey) => { onNavigate(k); setMobileOpen(false); };

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <div className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <img src={logo} alt="Thabayehkom" style={{ width: collapsed ? 40 : 140 }} />
        </div>
        <nav className="sidebar-menu">
          {NAV.map((n, i) =>
            'section' in n ? (
              <div key={i} className="menu-section">{n.section[lang]}</div>
            ) : (
              <button
                key={n.key}
                className={`menu-item ${current === n.key ? 'active' : ''}`}
                onClick={() => go(n.key)}
                title={collapsed ? n.label[lang] : undefined}
              >
                <i className={`fas fa-${n.icon}`} />
                <span>{n.label[lang]}</span>
              </button>
            ),
          )}
        </nav>
      </div>
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <div className="main">
        <div className="topbar">
          <div className="topbar-left">
            <button className="toggle-btn" onClick={toggle} aria-label="Toggle menu">
              <i className="fas fa-bars" />
            </button>
            <div className="topbar-title">{PAGE_TITLES[current]?.[lang] ?? current}</div>
          </div>
          <div className="topbar-right">
            <button className="lang-btn" onClick={onToggleLang}>🌐 {lang === 'ar' ? 'EN' : 'AR'}</button>
            <div className="user-avatar" title={userName}>{(userName || 'A').charAt(0).toUpperCase()}</div>
            <button className="btn btn-outline btn-sm" onClick={onLogout} title="Logout">
              <i className="fas fa-sign-out-alt" />
            </button>
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
