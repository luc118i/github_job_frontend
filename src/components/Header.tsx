import { useState } from 'react';
import { AuthUser } from '../services/auth';
import { View } from './TabNav';

interface HeaderProps {
  currentUser: AuthUser | null;
  view: View;
  onViewChange: (v: View) => void;
  onLogout: () => void;
  onLoginClick: () => void;
  onProfileClick: () => void;
}

const IconGrid = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <rect x="0.5" y="0.5" width="5" height="5" rx="1" stroke="currentColor" strokeOpacity="0.7"/>
    <rect x="7.5" y="0.5" width="5" height="5" rx="1" stroke="currentColor" strokeOpacity="0.7"/>
    <rect x="0.5" y="7.5" width="5" height="5" rx="1" stroke="currentColor" strokeOpacity="0.7"/>
    <rect x="7.5" y="7.5" width="5" height="5" rx="1" stroke="currentColor" strokeOpacity="0.7"/>
  </svg>
);

const IconMonitor = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <rect x="0.5" y="1.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeOpacity="0.7"/>
    <path d="M4 11.5h5M6.5 9.5v2" stroke="currentColor" strokeOpacity="0.7" strokeLinecap="round"/>
  </svg>
);

const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeOpacity="0.7"/>
    <path d="M9 9l2.5 2.5" stroke="currentColor" strokeOpacity="0.7" strokeLinecap="round"/>
  </svg>
);

const IconOrg = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <rect x="0.5" y="0.5" width="4" height="12" rx="1" stroke="currentColor" strokeOpacity="0.7"/>
    <rect x="6.5" y="0.5" width="6" height="5" rx="1" stroke="currentColor" strokeOpacity="0.7"/>
    <rect x="6.5" y="7.5" width="6" height="5" rx="1" stroke="currentColor" strokeOpacity="0.7"/>
  </svg>
);

const IconChevron = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M2.5 3.5L5 6l2.5-2.5" stroke="currentColor" strokeOpacity="0.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const TABS: { view: View; label: string; Icon: () => JSX.Element }[] = [
  { view: 'buscar',  label: 'buscar',       Icon: IconGrid    },
  { view: 'outros',  label: 'vagas TI',     Icon: IconMonitor },
  { view: 'analise', label: 'analisar vaga', Icon: IconSearch  },
  { view: 'history', label: 'organizar',    Icon: IconOrg     },
];

export function Header({ currentUser, view, onViewChange, onLogout, onLoginClick, onProfileClick }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  function navigate(v: View) {
    onViewChange(v);
    setMenuOpen(false);
  }

  const displayName = currentUser?.name
    ?? currentUser?.email?.split('@')[0]?.toUpperCase()
    ?? '';

  return (
    <>
      <header className="hdr">
        <div className="hdr-inner">

          {/* Logo */}
          <button className="hdr-logo" onClick={() => navigate('buscar')}>
            JOBFINDER
          </button>

          {/* Desktop tabs */}
          <nav className="hdr-tabs">
            {TABS.map(({ view: v, label, Icon }) => (
              <button
                key={v}
                className={`hdr-tab${view === v ? ' hdr-tab--active' : ''}`}
                onClick={() => navigate(v)}
              >
                <span className="hdr-tab-icon"><Icon /></span>
                {label}
              </button>
            ))}
          </nav>

          {/* Auth */}
          <div className="hdr-auth">
            {currentUser ? (
              <>
                <button className="hdr-user-btn" onClick={onProfileClick}>
                  <span className="hdr-online-dot" />
                  <span className="hdr-user-name">{displayName}</span>
                  <IconChevron />
                </button>
                <button className="hdr-logout-btn" onClick={onLogout}>sair</button>
              </>
            ) : (
              <button className="hdr-login-btn" onClick={onLoginClick}>entrar</button>
            )}
          </div>

          {/* Burger (mobile) */}
          <button
            className={`hdr-burger${menuOpen ? ' hdr-burger--open' : ''}`}
            onClick={() => setMenuOpen(m => !m)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>

        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div className="hdr-backdrop" onClick={() => setMenuOpen(false)} />
          <nav className="hdr-drawer">
            {TABS.map(({ view: v, label, Icon }) => (
              <button
                key={v}
                className={`hdr-drawer-item${view === v ? ' active' : ''}`}
                onClick={() => navigate(v)}
              >
                <Icon /> {label}
              </button>
            ))}
            {currentUser ? (
              <>
                <button className="hdr-drawer-item" onClick={() => { onProfileClick(); setMenuOpen(false); }}>perfil</button>
                <button className="hdr-drawer-item" onClick={() => { onLogout(); setMenuOpen(false); }}>sair</button>
              </>
            ) : (
              <button className="hdr-drawer-item" onClick={() => { onLoginClick(); setMenuOpen(false); }}>entrar</button>
            )}
          </nav>
        </>
      )}
    </>
  );
}
