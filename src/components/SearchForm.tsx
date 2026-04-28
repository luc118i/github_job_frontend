interface SearchFormProps {
  username: string;
  loading: boolean;
  error: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}

export function SearchForm({ username, loading, error, onChange, onSearch }: SearchFormProps) {
  return (
    <>
      <div className="search-bar">
        <span className="prefix">github.com/</span>
        <input
          type="text"
          placeholder="seu-usuario"
          value={username}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          disabled={loading}
        />
      </div>
      <button
        className="search-btn"
        onClick={onSearch}
        disabled={loading || !username.trim()}
      >
        {loading ? 'buscando...' : 'buscar vagas'}
      </button>
      {error && <div className="error-msg">{error}</div>}
    </>
  );
}
