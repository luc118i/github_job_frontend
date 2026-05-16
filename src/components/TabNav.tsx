export type View = 'search' | 'history' | 'outros' | 'analise' | 'profile';

interface TabNavProps {
  active: View;
  showProfile: boolean;
  isLoggedIn: boolean;   // controla visibilidade da aba "organizar"
  staleCount: number;    // vagas em "aplicadas" há +7 dias — exibe badge de alerta
  onChange: (view: View) => void;
}

export function TabNav({ active, showProfile, isLoggedIn, staleCount, onChange }: TabNavProps) {
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
        className={`tab-btn ${active === 'analise' ? 'active' : ''}`}
        onClick={() => onChange('analise')}
      >
        analisar vaga
      </button>

      {/* "organizar" só aparece para usuários logados — dados são pessoais */}
      {isLoggedIn && (
        <button
          className={`tab-btn ${active === 'history' ? 'active' : ''}`}
          onClick={() => onChange('history')}
        >
          organizar
          {/* badge vermelho quando há vagas paradas em "aplicadas" há mais de 7 dias */}
          {staleCount > 0 && (
            <span className="tab-stale-badge" title={`${staleCount} vaga${staleCount > 1 ? 's' : ''} sem resposta há +7 dias`}>
              {staleCount}
            </span>
          )}
        </button>
      )}

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
