import { AuthUser } from '../services/auth';

interface HeaderProps {
  currentUser: AuthUser | null;
  onLogout: () => void;
  onLoginClick: () => void;
  onProfileClick: () => void;
}

export function Header({ currentUser, onLogout, onLoginClick, onProfileClick }: HeaderProps) {
  return (
    <header>
      <div className="header-row">
        <div>
          <div className="logo">JobFinder</div>
          <div className="tagline">powered by github × claude ai</div>
        </div>

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
  );
}
