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

const IconGlobe = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="6.5" cy="6.5" r="6" stroke="currentColor" strokeOpacity="0.7"/>
    <path d="M0.7 6.5h11.6M6.5 0.7c1.7 1.8 1.7 9.8 0 11.6M6.5 0.7c-1.7 1.8-1.7 9.8 0 11.6" stroke="currentColor" strokeOpacity="0.7"/>
  </svg>
);

const IconStack = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M6.5 1L12 3.75 6.5 6.5 1 3.75 6.5 1z" stroke="currentColor" strokeOpacity="0.7" strokeLinejoin="round"/>
    <path d="M1 6.75L6.5 9.5 12 6.75" stroke="currentColor" strokeOpacity="0.7" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1 9.75L6.5 12.5 12 9.75" stroke="currentColor" strokeOpacity="0.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconChevron = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M2.5 3.5L5 6l2.5-2.5" stroke="currentColor" strokeOpacity="0.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconCompass = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="6.5" cy="6.5" r="6" stroke="currentColor" strokeOpacity="0.7"/>
    <path d="M9 4L7.2 7.2 4 9l1.8-3.2L9 4z" stroke="currentColor" strokeOpacity="0.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/** Item de navegação. Fonte única de verdade — reusado no header (desktop) e na BottomNav (mobile). */
export interface NavTab {
  view: View;
  label: string;
  /** Label curto para a Bottom Tab Bar (espaço apertado no mobile). Cai no `label` se ausente. */
  short?: string;
  Icon: () => JSX.Element;
  /** Aba exclusiva de quem tem conta (oculta para visitantes). */
  authOnly?: boolean;
}

export const NAV_TABS: NavTab[] = [
  { view: 'career',  label: 'carreira',      Icon: IconCompass, authOnly: true },
  { view: 'buscar',  label: 'buscar',        Icon: IconGrid    },
  { view: 'outros',  label: 'vagas TI',      Icon: IconMonitor, authOnly: true },
  { view: 'analise', label: 'analisar vaga', short: 'analisar', Icon: IconSearch  },
  { view: 'history', label: 'pipeline',       Icon: IconOrg,     authOnly: true },
  { view: 'projetos', label: 'projetos',     Icon: IconStack,   authOnly: true },
  { view: 'portfolio', label: 'portfólio',   Icon: IconGlobe,   authOnly: true },
];

/** Abas visíveis conforme login: visitante só vê as públicas. */
export function visibleNavTabs(currentUser: AuthUser | null): NavTab[] {
  return currentUser ? NAV_TABS : NAV_TABS.filter(t => !t.authOnly);
}

export function Header({ currentUser, view, onViewChange, onLogout, onLoginClick, onProfileClick }: HeaderProps) {
  const displayName = currentUser?.name
    ?? currentUser?.email?.split('@')[0]?.toUpperCase()
    ?? '';

  const visibleTabs = visibleNavTabs(currentUser);

  return (
    <header className="hdr">
      <div className="hdr-inner">

        {/* Logo */}
        <button className="hdr-logo" onClick={() => onViewChange('buscar')}>
          JOBFINDER
        </button>

        {/* Desktop tabs (no mobile, navegação fica na BottomNav) */}
        <nav className="hdr-tabs">
          {visibleTabs.map(({ view: v, label, Icon }) => (
            <button
              key={v}
              className={`hdr-tab${view === v ? ' hdr-tab--active' : ''}`}
              onClick={() => onViewChange(v)}
            >
              <span className="hdr-tab-icon"><Icon /></span>
              {label}
            </button>
          ))}
        </nav>

        {/* Auth (compacto no mobile) */}
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

      </div>
    </header>
  );
}
