import { useState, useEffect, useRef } from 'react';
import { CareerProfile, LinkedInData, ProfessionJobRecord, UserPreferences } from '../types';
import { View } from './TabNav';
import { JobCard } from './JobCard';
import { TagFilterBar } from './TagFilterBar';
import { ProfileScoreCard } from './ProfileScoreCard';
import { AiAnalysisPanel } from './AiAnalysisPanel';
import { useProfessionSearch } from '../hooks/useProfessionSearch';
import { fetchLastQuery } from '../services/searches';
import { fetchTrendingSuggestions } from '../services/career';
import { blockKeyword, likeKeyword, blockSource, likeSource } from '../utils/jobPreferences';

const MODALITY_OPTIONS: { value: UserPreferences['modality']; label: string }[] = [
  { value: 'any',        label: 'Qualquer' },
  { value: 'remote',     label: 'Remoto'   },
  { value: 'presencial', label: 'Presencial' },
  { value: 'hybrid',     label: 'Híbrido'  },
];

const AGE_OPTIONS: { value: number; label: string }[] = [
  { value: 7,  label: '7 dias'  },
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
  { value: 90, label: '3 meses' },
];

interface BuscarViewProps {
  careerProfile: CareerProfile | null;
  preferences: UserPreferences;
  linkedIn: LinkedInData | null;
  githubUsername?: string | null;
  onNavigate: (v: View) => void;
  onGenerateCv: (job: ProfessionJobRecord) => void;
  onViewCv: (job: ProfessionJobRecord) => void;
  onPreferencesChange: (p: UserPreferences) => void;
  onCareerComplete: (p: CareerProfile) => void;
  onCareerRedo: () => void;
  onGithubChange?: (username: string | null) => void;
  /** Dispara o fluxo de upload de CV + análise da IA (onboarding) sem exigir login. */
  onStartOnboarding: () => void;
  /** Pré-preenche a busca (ex.: ao clicar "buscar vagas" num projeto). */
  initialQuery?: string;
}

const AREA_TO_TITLES: Record<string, string[]> = {
  'ti':           ['Analista de TI', 'Analista de Sistemas'],
  'tecnologia':   ['Analista de TI', 'Analista de Sistemas'],
  'dados':        ['Analista de Dados', 'Analista de BI'],
  'data':         ['Analista de Dados', 'Engenheiro de Dados'],
  'software':     ['Desenvolvedor de Software', 'Engenheiro de Software'],
  'dev':          ['Desenvolvedor Full Stack', 'Desenvolvedor Backend'],
  'frontend':     ['Desenvolvedor Frontend', 'Engenheiro Frontend'],
  'backend':      ['Desenvolvedor Backend', 'Engenheiro Backend'],
  'fullstack':    ['Desenvolvedor Full Stack'],
  'nodejs':       ['Desenvolvedor Node.js', 'Desenvolvedor Backend'],
  'python':       ['Desenvolvedor Python', 'Engenheiro de Dados'],
  'javascript':   ['Desenvolvedor JavaScript', 'Desenvolvedor Frontend'],
  'react':        ['Desenvolvedor React', 'Desenvolvedor Frontend'],
  'mobile':       ['Desenvolvedor Mobile', 'Desenvolvedor React Native'],
  'devops':       ['Engenheiro DevOps', 'SRE'],
  'cloud':        ['Engenheiro Cloud', 'Arquiteto de Nuvem'],
  'ux':           ['UX Designer', 'Product Designer'],
  'ui':           ['UI Designer', 'Product Designer'],
  'produto':      ['Product Manager', 'Product Owner'],
  'qa':           ['Analista de QA', 'Engenheiro de Testes'],
  'ia':           ['Engenheiro de ML', 'Cientista de Dados'],
  'marketing':    ['Analista de Marketing', 'Analista de Marketing Digital'],
  'financeiro':   ['Analista Financeiro', 'Analista Contábil'],
  'administrativo': ['Assistente Administrativo', 'Analista Administrativo'],
  'rh':           ['Analista de RH', 'Analista de Recursos Humanos'],
  'vendas':       ['Executivo de Vendas', 'Representante Comercial'],
};

function norm(s: string) {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Gera sugestões de busca a partir do perfil de carreira, expandindo áreas em cargos reais */
function buildProfileSuggestions(profile: CareerProfile): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const areas = [...(profile.desiredAreas ?? []), profile.transitionTarget ?? ''].filter(Boolean);

  for (const area of areas) {
    const key = norm(area.trim());
    let matched = false;
    for (const [term, titles] of Object.entries(AREA_TO_TITLES)) {
      if (key.includes(term) || term.includes(key)) {
        for (const t of titles) {
          if (!seen.has(t)) { seen.add(t); out.push(t); }
        }
        matched = true;
        break;
      }
    }
    // Se a área não mapeou mas é um cargo curto e direto, usa como está
    if (!matched && area.trim().split(' ').length <= 4 && area.trim().length > 2) {
      if (!seen.has(area.trim())) { seen.add(area.trim()); out.push(area.trim()); }
    }
    if (out.length >= 4) break;
  }

  return out.slice(0, 4);
}

export function BuscarView({
  careerProfile,
  preferences,
  linkedIn,
  onNavigate,
  onGenerateCv,
  onViewCv,
  onPreferencesChange,
  onStartOnboarding,
  initialQuery,
}: BuscarViewProps) {
  const {
    jobs,
    bonusJobs,
    loading,
    error,
    profileSummary,
    tagFilter,
    blockedToday,
    setTagFilter,
    search,
    searchByQuery,
    reset,
    removeJob,
    hasSearched,
  } = useProfessionSearch();

  const [query, setQuery] = useState(initialQuery ?? '');
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [trendSuggestions, setTrendSuggestions] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [locationDraft, setLocationDraft] = useState(preferences.location ?? '');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleDetectLocation() {
    if (!navigator.geolocation) return;
    setDetectingLocation(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      const { latitude, longitude } = pos.coords;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt-BR`
      );
      const data = await res.json() as { address?: Record<string, string> };
      const city = data.address?.city ?? data.address?.town ?? data.address?.municipality ?? '';
      const state = data.address?.state ?? '';
      const location = city ? `${city}, ${state}` : state;
      if (location) setLocationDraft(location);
    } catch {
      // usuario negou ou timeout — não faz nada
    } finally {
      setDetectingLocation(false);
    }
  }

  // Fecha o popover ao clicar fora
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    if (filterOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [filterOpen]);

  // Sincroniza draft quando preferences muda externamente
  useEffect(() => { setLocationDraft(preferences.location ?? ''); }, [preferences.location]);

  function applyLocation() {
    onPreferencesChange({ ...preferences, location: locationDraft.trim() });
    setFilterOpen(false);
  }

  const hasActiveFilter = !!(preferences.location || preferences.modality !== 'any' || preferences.maxAgeDays !== 90);

  // Foca o input ao montar
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Carrega o último termo buscado — usado como semente do "Descobrir Vagas".
  useEffect(() => { fetchLastQuery().then(r => setLastQuery(r.query)); }, []);

  // Tendências de mercado para o perfil — enriquecem o "Sugerido para você".
  // Best-effort: falha silenciosa cai no fallback das sugestões declaradas.
  useEffect(() => {
    if (!careerProfile) { setTrendSuggestions([]); return; }
    let active = true;
    fetchTrendingSuggestions(careerProfile).then(t => { if (active) setTrendSuggestions(t); });
    return () => { active = false; };
  }, [careerProfile]);

  // Foca com Ctrl+K / ⌘K
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

  // Sugestões: perfil declarado + tendências de mercado, dedup entre grupos, 4 + 4 máx.
  const { profileSuggestions, trendingSuggestions } = (() => {
    const profile = careerProfile ? buildProfileSuggestions(careerProfile) : [];
    const seen = new Set(profile.map(s => s.trim().toLowerCase()));
    const trending = trendSuggestions.filter(s => {
      const k = s.trim().toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 4);
    return { profileSuggestions: profile, trendingSuggestions: trending };
  })();
  const hasSuggestions = profileSuggestions.length > 0 || trendingSuggestions.length > 0;
  const hasQuery = query.trim().length > 0;

  // Perfil sem transitionReady para buscas genéricas (transição é exclusivo de "vagas ti")
  const genericProfile = careerProfile
    ? { ...careerProfile, transitionReady: false }
    : null;

  function handleSearch(q?: string) {
    const term = (q ?? query).trim();
    if (term) {
      searchByQuery(term, preferences, genericProfile, linkedIn);
    } else {
      handleDiscover();
    }
  }

  function handleDiscover() {
    // Cascata: reaproveita o último termo buscado → busca por perfil (CV) →
    // onboarding. Assim quem já buscou antes não esbarra na parede de CV.
    if (lastQuery) { searchByQuery(lastQuery, preferences, genericProfile, linkedIn); return; }
    if (linkedIn) { search(linkedIn, preferences, genericProfile); return; }
    onStartOnboarding();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch();
  }

  function handleSuggestion(s: string) {
    setQuery(s);
    searchByQuery(s, preferences, genericProfile, linkedIn);
  }

  // Sem perfil, qualquer CTA de "completar perfil" leva ao fluxo do CV (não ao login).
  function handleProfileNav(v: View) {
    if (!careerProfile) { onStartOnboarding(); return; }
    onNavigate(v);
  }

  const allTags = [...new Set(jobs.flatMap(j => j.skills))];
  const filtered = tagFilter === 'all' ? jobs : jobs.filter(j => j.skills.includes(tagFilter));

  return (
    <div className="bv-root">

      {/* ── Hero / Barra de busca ── */}
      <div className={`bv-hero${hasSearched || loading ? ' bv-hero--compact' : ''}`}>
        {!hasSearched && !loading && (
          <>
            <div className="bv-badge">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="0.5" y="0.5" width="5.2" height="5.2" rx="1" stroke="currentColor" strokeOpacity="0.8"/>
                <rect x="7.3" y="0.5" width="5.2" height="5.2" rx="1" stroke="currentColor" strokeOpacity="0.8"/>
                <rect x="0.5" y="7.3" width="5.2" height="5.2" rx="1" stroke="currentColor" strokeOpacity="0.8"/>
                <rect x="7.3" y="7.3" width="5.2" height="5.2" rx="1" stroke="currentColor" strokeOpacity="0.8"/>
              </svg>
              BUSCA UNIVERSAL
            </div>
            <h1 className="bv-headline">
              Encontre a <span className="bv-accent">oportunidade</span> certa.
            </h1>
            <p className="bv-subtitle">
              Busque vagas em qualquer area, qualquer nivel, em qualquer lugar.
            </p>
          </>
        )}

        {/* Barra de busca */}
        <div className="bv-search-row">
          <div className="bv-search-input-wrap">
            <svg className="bv-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input
              ref={inputRef}
              className="bv-search-input"
              placeholder={
                careerProfile
                  ? `Cargo, area ou empresa...`
                  : 'Ex: Analista de Dados, Assistente ADM, Vendas...'
              }
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            {query && (
              <button className="bv-clear-btn" onClick={() => setQuery('')}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          <button
            className={`bv-search-btn${hasQuery ? ' bv-search-btn--text' : ' bv-search-btn--discover'}`}
            onClick={() => handleSearch()}
            disabled={loading || blockedToday}
          >
            {loading ? (
              <span className="bv-spinner" />
            ) : hasQuery ? (
              'Buscar Vagas'
            ) : (
              'Descobrir Vagas'
            )}
          </button>

          {/* Botão de filtros rápidos */}
          <div className="bv-filter-wrap" ref={filterRef}>
            <button
              className={`bv-filter-btn${hasActiveFilter ? ' bv-filter-btn--active' : ''}`}
              title="Filtros de localização e modalidade"
              onClick={() => setFilterOpen(o => !o)}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M1 3h13M3 7.5h9M5.5 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {hasActiveFilter && <span className="bv-filter-dot" />}
            </button>

            {filterOpen && (
              <div className="bv-filter-popover">
                <div className="bv-fp-title">Filtros de busca</div>

                <div className="bv-fp-field">
                  <label className="bv-fp-label">Localização</label>
                  <div className="bv-fp-input-row">
                    <input
                      className="bv-fp-input"
                      placeholder="ex: Brasília, DF"
                      value={locationDraft}
                      onChange={e => setLocationDraft(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && applyLocation()}
                      autoFocus
                    />
                    {locationDraft
                      ? <button className="bv-fp-clear" onClick={() => setLocationDraft('')}>✕</button>
                      : navigator.geolocation && (
                          <button
                            className={`bv-fp-geo-btn${detectingLocation ? ' bv-fp-geo-btn--loading' : ''}`}
                            onClick={handleDetectLocation}
                            disabled={detectingLocation}
                            title="Usar minha localização"
                          >
                            {detectingLocation ? '...' : '⊕'}
                          </button>
                        )
                    }
                  </div>
                  {!locationDraft && (
                    <span className="bv-fp-hint">vazio = nacional 🇧🇷</span>
                  )}
                </div>

                <div className="bv-fp-field">
                  <label className="bv-fp-label">Modalidade</label>
                  <div className="bv-fp-modality-row">
                    {MODALITY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        className={`bv-fp-mod-btn${preferences.modality === opt.value ? ' bv-fp-mod-btn--active' : ''}`}
                        onClick={() => onPreferencesChange({ ...preferences, modality: opt.value })}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bv-fp-field">
                  <label className="bv-fp-label">Publicação</label>
                  <div className="bv-fp-modality-row">
                    {AGE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        className={`bv-fp-mod-btn${preferences.maxAgeDays === opt.value ? ' bv-fp-mod-btn--active' : ''}`}
                        onClick={() => onPreferencesChange({ ...preferences, maxAgeDays: opt.value })}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="bv-fp-apply" onClick={applyLocation}>
                  Aplicar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sugestões inteligentes */}
        {!hasSearched && !loading && hasSuggestions && (
          <div className="bv-suggestions">
            {profileSuggestions.length > 0 && (
              <>
                <span className="bv-suggestions-label">Do seu perfil</span>
                <div className="bv-suggestions-chips">
                  {profileSuggestions.map(s => (
                    <button key={s} className="bv-suggestion-chip" onClick={() => handleSuggestion(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
            {trendingSuggestions.length > 0 && (
              <>
                <span className="bv-suggestions-label bv-suggestions-label--trend">Em alta</span>
                <div className="bv-suggestions-chips">
                  {trendingSuggestions.map(s => (
                    <button key={s} className="bv-suggestion-chip bv-suggestion-chip--trend" onClick={() => handleSuggestion(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

          </div>
        )}

        {/* Profile score — completude do perfil */}
        {!hasSearched && !loading && (
          <ProfileScoreCard
            careerProfile={careerProfile}
            linkedIn={linkedIn}
            preferences={preferences}
            onNavigate={handleProfileNav}
          />
        )}

        {/* Link de preferências */}
        {!hasSearched && !loading && (
          <div className="bv-prefs-row">
            <button className="bv-prefs-link" onClick={() => handleProfileNav('career')}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M1.5 11.5c0-2.209 2.238-4 5-4s5 1.791 5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Ajustar preferencias e perfil
            </button>

            {hasSearched && (
              <button className="bv-reset-btn" onClick={reset}>
                Nova busca
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Feature cards (só na tela inicial) ── */}
      {!hasSearched && !loading && (
        <div className="bv-features">
          <div className="bv-feature-card">
            <div className="bv-feature-icon bv-fi--blue">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 2c-2.5 3-4 5.5-4 9s1.5 6 4 9M11 2c2.5 3 4 5.5 4 9s-1.5 6-4 9M2 11h18" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </div>
            <h3 className="bv-feature-title">Universal</h3>
            <p className="bv-feature-desc">Vagas de todas as areas em um so lugar.</p>
          </div>
          <div className="bv-feature-card">
            <div className="bv-feature-icon bv-fi--purple">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 1v2M11 19v2M1 11h2M19 11h2M3.93 3.93l1.41 1.41M16.66 16.66l1.41 1.41M3.93 18.07l1.41-1.41M16.66 5.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="11" cy="11" r="3.5" fill="currentColor"/>
              </svg>
            </div>
            <h3 className="bv-feature-title">Inteligente</h3>
            <p className="bv-feature-desc">Resultados relevantes com IA e aprendizado continuo.</p>
          </div>
          <div className="bv-feature-card">
            <div className="bv-feature-icon bv-fi--green">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M13 2L4 13h7l-2 7 9-11h-7l2-7z" fill="currentColor" opacity="0.9"/>
              </svg>
            </div>
            <h3 className="bv-feature-title">Atualizado</h3>
            <p className="bv-feature-desc">Novas vagas todos os dias, em tempo real.</p>
          </div>
        </div>
      )}

      {/* ── Loading: painel de IA em tempo real ── */}
      {loading && (
        <div className="bv-loading">
          <AiAnalysisPanel
            term={query.trim() || undefined}
            hasCv={!!linkedIn}
            hasProfile={!!careerProfile}
          />
        </div>
      )}

      {/* ── Resultados ── */}
      {!loading && hasSearched && (
        <div className="bv-results">
          <div className="bv-results-header">
            {profileSummary && (
              <div className="bv-results-summary">
                <span className="bv-results-label">Resultados para</span>
                <span className="bv-results-term">{profileSummary}</span>
              </div>
            )}
            <button className="bv-reset-btn" onClick={reset}>
              ← Nova busca
            </button>
          </div>

          {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

          {filtered.length > 0 ? (
            <>
              <TagFilterBar tags={allTags} active={tagFilter} count={filtered.length} onChange={setTagFilter} />
              <div className="jobs-grid bv-jobs-grid">
                {filtered.map((job, i) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    index={i}
                    match={job.match}
                    onGenerateCv={() => onGenerateCv(job)}
                    onViewCv={() => onViewCv(job)}
                    onLike={(_j, cat) => likeKeyword(cat)}
                    onBlock={(_j, cat) => { blockKeyword(cat); removeJob(job.id); }}
                    onLikeSource={(_j, src) => likeSource(src)}
                    onBlockSource={(_j, src) => blockSource(src)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="bv-empty">
              {bonusJobs.length > 0
                ? 'Nenhuma vaga encontrada dentro dos seus filtros. Veja abaixo vagas compatíveis com o seu perfil.'
                : 'Nenhuma vaga encontrada. Tente outro termo.'}
            </div>
          )}

          {bonusJobs.length > 0 && (
            <div className="bv-bonus-section">
              <div className="bv-bonus-header">
                <div className="bv-bonus-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1l1.5 3.5L12 5l-2.5 2.5.5 3.5L7 9.5 4 11l.5-3.5L2 5l3.5-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div className="bv-bonus-title">Fora dos seus filtros, mas compatíveis com o seu perfil</div>
                  <div className="bv-bonus-subtitle">Estas vagas não atendem a todos os seus critérios, mas apresentam alta compatibilidade com a sua experiência e habilidades.</div>
                </div>
              </div>
              <div className="jobs-grid bv-jobs-grid">
                {bonusJobs.map((job, i) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    index={i}
                    match={job.match}
                    onGenerateCv={() => onGenerateCv(job)}
                    onViewCv={() => onViewCv(job)}
                    onLike={(_j, cat) => likeKeyword(cat)}
                    onBlock={(_j, cat) => { blockKeyword(cat); removeJob(job.id); }}
                    onLikeSource={(_j, src) => likeSource(src)}
                    onBlockSource={(_j, src) => blockSource(src)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
