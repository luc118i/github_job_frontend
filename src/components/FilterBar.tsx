import { LevelFilter } from '../types';

const LEVELS: LevelFilter[] = ['all', 'Junior', 'Pleno', 'Senior'];

interface FilterBarProps {
  active: LevelFilter;
  count: number;
  onChange: (level: LevelFilter) => void;
}

export function FilterBar({ active, count, onChange }: FilterBarProps) {
  return (
    <div className="section-header">
      <span className="section-title">{count} vagas encontradas</span>
      <div className="filter-tabs">
        {LEVELS.map((l) => (
          <button
            key={l}
            className={`filter-tab ${active === l ? 'active' : ''}`}
            onClick={() => onChange(l)}
          >
            {l === 'all' ? 'todos' : l}
          </button>
        ))}
      </div>
    </div>
  );
}
