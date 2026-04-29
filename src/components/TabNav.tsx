export type View = 'search' | 'history' | 'outros';

interface TabNavProps {
  active: View;
  onChange: (view: View) => void;
}

export function TabNav({ active, onChange }: TabNavProps) {
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
    </nav>
  );
}
