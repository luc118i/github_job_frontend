import { useEffect, useRef, useState } from 'react';
import { View } from './TabNav';

interface Props {
  onNavigate: (v: View) => void;
  onSearch: (query: string) => void;
  onDailySearch: () => void;
  onNewSearch: () => void;
  hasProfile: boolean;
  loading: boolean;
  hasSearched: boolean;
  dailyDone: boolean;
}

/* ── Icons ── */
const IconSearchLg = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 12l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconSparkle = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="8" cy="8" r="2.5" fill="currentColor"/>
  </svg>
);

const IconGlobe = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M11 2c-2.5 3-4 5.5-4 9s1.5 6 4 9M11 2c2.5 3 4 5.5 4 9s-1.5 6-4 9M2 11h18" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const IconLightning = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M13 2L4 13h7l-2 7 9-11h-7l2-7z" fill="currentColor" opacity="0.9"/>
  </svg>
);

const IconCode = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M4 3L1 6.5 4 10M9 3l3 3.5L9 10M7 2l-2 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconCubeGrid = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="0.5" y="0.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeOpacity="0.8"/>
    <rect x="8" y="0.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeOpacity="0.8"/>
    <rect x="0.5" y="8" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeOpacity="0.8"/>
    <rect x="8" y="8" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeOpacity="0.8"/>
  </svg>
);

const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SEARCH_TYPES = ['Cargo', 'Area', 'Empresa', 'Cidade', 'Remoto'] as const;
type SearchType = typeof SEARCH_TYPES[number];

const PLACEHOLDERS: Record<SearchType, string> = {
  Cargo:   'Ex: Desenvolvedor Frontend, Analista de RH, Gerente de Projetos...',
  Area:    'Ex: Tecnologia, Marketing, Logistica, Financas...',
  Empresa: 'Ex: Google, Itau, Ambev, Magazine Luiza...',
  Cidade:  'Ex: Sao Paulo, Brasilia, Curitiba, Remoto...',
  Remoto:  'Buscar vagas 100% remotas em qualquer area...',
};

const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M4.5 1v3M9.5 1v3M1 6h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1.5 12.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export function LandingSearch({ onNavigate, onSearch, onDailySearch, onNewSearch, hasProfile, loading, hasSearched, dailyDone }: Props) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('Cargo');
  const inputRef = useRef<HTMLInputElement>(null);

  /* ⌘K / Ctrl+K to focus */
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function handleSearch() {
    const q = query.trim();
    if (q) onSearch(q);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch();
  }

  /* ── Search bar (shared between hero and compact mode) ── */
  const searchBar = (
    <div className="ls-search-wrap">
      <div className="ls-search-bar">
        <span className="ls-search-icon"><IconSearchLg /></span>
        <input
          ref={inputRef}
          className="ls-search-input"
          placeholder={PLACEHOLDERS[searchType]}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
        />
        <kbd className="ls-kbd"><span>⌘</span> K</kbd>
        <button className="ls-search-btn" onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? <span className="ls-spinner" /> : <IconSparkle />}
        </button>
      </div>

      {/* Chips */}
      <div className="ls-chips">
        <span className="ls-chips-label">Buscar por</span>
        {SEARCH_TYPES.map(t => (
          <button
            key={t}
            className={`ls-chip${searchType === t ? ' ls-chip--active' : ''}`}
            onClick={() => setSearchType(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Botao diario — some quando limite ja foi atingido */}
      {!dailyDone && (
        <div className="ls-daily-row">
          {hasSearched ? (
            <button className="ls-daily-btn ls-daily-btn--reset" onClick={onNewSearch}>
              <IconX />
              Nova busca
            </button>
          ) : (
            <>
              <button className="ls-daily-btn" onClick={onDailySearch}>
                {hasProfile ? (
                  <><IconCalendar />Buscar vagas do dia</>
                ) : (
                  <><IconUser />Criar perfil inteligente</>
                )}
              </button>
              <span className="ls-daily-hint">
                {hasProfile
                  ? 'Vagas selecionadas com base no seu perfil de carreira'
                  : 'Responda algumas perguntas e receba vagas personalizadas'}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={`ls-root${hasSearched || loading ? ' ls-root--compact' : ''}`}>

      {hasSearched || loading ? (
        /* ── Compact mode: only search bar ── */
        <div className="ls-hero ls-hero--compact">
          {searchBar}
        </div>
      ) : (
        /* ── Full hero ── */
        <div className="ls-hero">
          <div className="ls-badge">
            <IconCubeGrid />
            BUSCA UNIVERSAL
          </div>
          <h1 className="ls-headline">
            Encontre a <span className="ls-accent">oportunidade</span> certa.
          </h1>
          <p className="ls-subtitle">
            Busque vagas em qualquer area, qualquer nivel, em qualquer lugar.
          </p>
          {searchBar}
        </div>
      )}

      {/* Feature cards — only on initial state */}
      {!hasSearched && !loading && (
        <>
          <div className="ls-features">
            <div className="ls-feature-card">
              <div className="ls-feature-icon ls-fi--blue"><IconGlobe /></div>
              <h3 className="ls-feature-title">Universal</h3>
              <p className="ls-feature-desc">Vagas de todas as areas em um so lugar.</p>
            </div>
            <div className="ls-feature-card">
              <div className="ls-feature-icon ls-fi--purple"><IconSparkle /></div>
              <h3 className="ls-feature-title">Inteligente</h3>
              <p className="ls-feature-desc">Resultados relevantes com IA e aprendizado continuo.</p>
            </div>
            <div className="ls-feature-card">
              <div className="ls-feature-icon ls-fi--green"><IconLightning /></div>
              <h3 className="ls-feature-title">Atualizado</h3>
              <p className="ls-feature-desc">Novas vagas todos os dias, em tempo real.</p>
            </div>
          </div>

          <div className="ls-ti-card">
            <div className="ls-ti-content">
              <div className="ls-ti-badge"><IconCode />VAGAS DE TI</div>
              <h2 className="ls-ti-title">Buscador especializado para tecnologia</h2>
              <p className="ls-ti-desc">
                Encontre vagas voltadas para Dev, Dados, Design, DevOps e muito mais.
              </p>
              <button className="ls-ti-btn" onClick={() => onNavigate('outros')}>
                Acessar vagas de TI <IconArrow />
              </button>
            </div>
            <div className="ls-ti-illustration" aria-hidden>
              <div className="ls-chip-outer">
                <div className="ls-chip-inner"><span className="ls-chip-code">&lt;/&gt;</span></div>
                <div className="ls-chip-pin ls-chip-pin--t1" /><div className="ls-chip-pin ls-chip-pin--t2" /><div className="ls-chip-pin ls-chip-pin--t3" />
                <div className="ls-chip-pin ls-chip-pin--r1" /><div className="ls-chip-pin ls-chip-pin--r2" />
                <div className="ls-chip-pin ls-chip-pin--b1" /><div className="ls-chip-pin ls-chip-pin--b2" /><div className="ls-chip-pin ls-chip-pin--b3" />
                <div className="ls-chip-pin ls-chip-pin--l1" /><div className="ls-chip-pin ls-chip-pin--l2" />
              </div>
              <div className="ls-float-dot ls-fd--1" /><div className="ls-float-dot ls-fd--2" /><div className="ls-float-dot ls-fd--3" />
              <div className="ls-float-line ls-fl--1" /><div className="ls-float-line ls-fl--2" />
            </div>
          </div>
        </>
      )}

    </div>
  );
}
