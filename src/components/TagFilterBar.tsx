interface TagFilterBarProps {
  tags: string[];
  active: string;
  count: number;
  onChange: (tag: string) => void;
}

export function TagFilterBar({ tags, active, count, onChange }: TagFilterBarProps) {
  return (
    <div className="section-header">
      <span className="section-title">{count} vagas encontradas</span>
      <div className="filter-tabs">
        <button
          className={`filter-tab ${active === 'all' ? 'active' : ''}`}
          onClick={() => onChange('all')}
        >
          todos
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            className={`filter-tab ${active === tag ? 'active' : ''}`}
            onClick={() => onChange(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
