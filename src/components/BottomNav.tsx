import { AuthUser } from '../services/auth';
import { View } from './TabNav';
import { visibleNavTabs } from './Header';

interface BottomNavProps {
  currentUser: AuthUser | null;
  view: View;
  onViewChange: (v: View) => void;
}

/**
 * Bottom Tab Bar — navegação primária no mobile (padrão MVC Mobile).
 * Substitui o menu burger: cada destino fica a um toque do polegar.
 * Reusa a mesma fonte de abas do Header e respeita o gating de login.
 * Escondida no desktop via CSS (.bnav só aparece em telas estreitas).
 */
export function BottomNav({ currentUser, view, onViewChange }: BottomNavProps) {
  const tabs = visibleNavTabs(currentUser);

  return (
    <nav className="bnav" aria-label="Navegação principal">
      {tabs.map(({ view: v, label, short, Icon }) => {
        const active = view === v;
        return (
          <button
            key={v}
            className={`bnav-item${active ? ' bnav-item--active' : ''}`}
            onClick={() => onViewChange(v)}
            aria-current={active ? 'page' : undefined}
          >
            <span className="bnav-icon"><Icon /></span>
            <span className="bnav-label">{short ?? label}</span>
          </button>
        );
      })}
    </nav>
  );
}
