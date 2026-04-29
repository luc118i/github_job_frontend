export type View = 'search' | 'history' | 'outros' | 'profile';

interface TabNavProps {
  active: View;
  showProfile: boolean;
  onChange: (view: View) => void;
}

export function TabNav({ active, showProfile, onChange }: TabNavProps) {
  return (
    <nav className="tab-nav">
      <button
        className={`tab-btn ${active === 'outros' ? 'active' : ''}`}
        onClick={() => onChange('outros')}
      >
        buscar
      </button>
      <button
        className={`tab-btn ${active === 'search' ? 'active' : ''}`}
        onClick={() => onChange('search')}
      >
        vagas TI
      </button>
      <button
        className={`tab-btn ${active === 'history' ? 'active' : ''}`}
        onClick={() => onChange('history')}
      >
        histórico
      </button>
      {showProfile && (
        <button
          className={`tab-btn ${active === 'profile' ? 'active' : ''}`}
          onClick={() => onChange('profile')}
        >
          perfil
        </button>
      )}
    </nav>
  );
}
