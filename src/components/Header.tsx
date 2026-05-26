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

export function Header({ currentUser, view, onViewChange, onLogout, onLoginClick, onProfileClick }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  function navigate(v: View) {
    onViewChange(v);
    setMenuOpen(false);
  }

  return (
    <>
      <header>
        <div className="header-row">
          <div className="logo">JobFinder</div>

          <nav className="header-tabs">
            <button className={`tab-btn ${view === 'outros' ? 'active' : ''}`} onClick={() => navigate('outros')}>buscar</button>
            <button className={`tab-btn ${view === 'search' ? 'active' : ''}`} onClick={() => navigate('search')}>vagas TI</button>
            <button className={`tab-btn ${view === 'analise' ? 'active' : ''}`} onClick={() => navigate('analise')}>analisar vaga</button>
            <button className={`tab-btn ${view === 'history' ? 'active' : ''}`} onClick={() => navigate('history')}>organizar</button>
          </nav>

          <button
            className={`header-burger${menuOpen ? ' header-burger--open' : ''}`}
            onClick={() => setMenuOpen(m => !m)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>

          <div className="header-auth">
            {currentUser ? (
              <>
                <button className="header-user-btn" onClick={onProfileClick}>
                  {currentUser.name ?? currentUser.email}
                </button>
                <button className="header-logout" onClick={onLogout}>sair</button>
              </>
            ) : (
              <button className="header-login" onClick={onLoginClick}>entrar</button>
            )}
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <div className="header-menu-backdrop" onClick={() => setMenuOpen(false)} />
          <nav className="header-menu">
            <button className={`header-menu-item${view === 'outros' ? ' active' : ''}`} onClick={() => navigate('outros')}>buscar</button>
            <button className={`header-menu-item${view === 'search' ? ' active' : ''}`} onClick={() => navigate('search')}>vagas TI</button>
            <button className={`header-menu-item${view === 'analise' ? ' active' : ''}`} onClick={() => navigate('analise')}>analisar vaga</button>
            <button className={`header-menu-item${view === 'history' ? ' active' : ''}`} onClick={() => navigate('history')}>organizar</button>
            {currentUser && (
              <button className={`header-menu-item${view === 'profile' ? ' active' : ''}`} onClick={() => { navigate('profile'); onProfileClick(); }}>perfil</button>
            )}
            {!currentUser && (
              <button className="header-menu-item" onClick={() => { onLoginClick(); setMenuOpen(false); }}>entrar</button>
            )}
          </nav>
        </>
      )}
    </>
  );
}
