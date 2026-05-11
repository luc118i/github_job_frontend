import { useCountdown } from '../hooks/useCountdown';

interface SearchFormProps {
  username: string;
  loading: boolean;
  error: string;
  blocked: boolean;
  remaining: number;
  locationReady: boolean;
  onChange: (value: string) => void;
  onSearch: () => void;
  onGoToHistory: () => void;
}

export function SearchForm({ username, loading, error, blocked, remaining, locationReady, onChange, onSearch, onGoToHistory }: SearchFormProps) {
  const countdown = useCountdown(blocked);

  const canSearch = !blocked && !!username.trim() && locationReady;

  let btnLabel: string;
  if (loading)             btnLabel = 'buscando...';
  else if (blocked)        btnLabel = `disponível em ${countdown}`;
  else if (!locationReady) btnLabel = 'informe sua localização para buscar';
  else                     btnLabel = 'buscar vagas';

  return (
    <>
      <div className="search-bar">
        <span className="prefix">github.com/</span>
        <input
          type="text"
          placeholder="seu-usuario"
          value={username}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canSearch && onSearch()}
          disabled={loading || blocked}
        />
      </div>

      <button
        className={`search-btn${blocked ? ' search-btn--countdown' : ''}`}
        onClick={onSearch}
        disabled={loading || !canSearch}
      >
        {btnLabel}
      </button>

      {blocked && (
        <div className="search-limit-msg">
          <span>Limite diário atingido. Recarrega à meia-noite.</span>
          <button className="search-limit-history" onClick={onGoToHistory}>
            Ver histórico →
          </button>
        </div>
      )}

      {!blocked && remaining < 5 && !loading && (
        <p className="searches-remaining">
          {remaining} {remaining === 1 ? 'busca restante' : 'buscas restantes'} hoje
        </p>
      )}

      {error && <div className="error-msg">{error}</div>}
    </>
  );
}
