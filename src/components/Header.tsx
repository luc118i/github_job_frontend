import { AuthUser } from '../services/auth';

interface HeaderProps {
  currentUser: AuthUser | null;
  onLogout: () => void;
  onLoginClick: () => void;
}

export function Header({ currentUser, onLogout, onLoginClick }: HeaderProps) {
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
              <span className="header-user">{currentUser.name ?? currentUser.email}</span>
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
