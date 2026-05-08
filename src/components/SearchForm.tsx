interface SearchFormProps {
  username: string;
  loading: boolean;
  error: string;
  blocked: boolean;
  remaining: number;
  onChange: (value: string) => void;
  onSearch: () => void;
  onGoToHistory: () => void;
}

export function SearchForm({ username, loading, error, blocked, remaining, onChange, onSearch, onGoToHistory }: SearchFormProps) {
  if (blocked) {
    return (
      <div className="search-blocked">
        <p className="search-blocked-msg">Você atingiu o limite de buscas hoje. Volte amanha para novas buscas.</p>
        <button className="history-link-btn" onClick={onGoToHistory}>Ver historico de vagas</button>
      </div>
    );
  }

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
      {remaining < 5 && !loading && (
        <p className="searches-remaining">{remaining} {remaining === 1 ? 'busca restante' : 'buscas restantes'} hoje</p>
      )}
      {error && <div className="error-msg">{error}</div>}
    </>
  );
}
