import { LinkedInData, ProfessionJobRecord, UserPreferences } from '../types';
import { LinkedInImport } from './LinkedInImport';
import { PreferencesPanel } from './PreferencesPanel';
import { TagFilterBar } from './TagFilterBar';
import { JobCard } from './JobCard';
import { useProfessionSearch } from '../hooks/useProfessionSearch';
import { useCountdown } from '../hooks/useCountdown';
import { blockKeyword, likeKeyword } from '../utils/jobPreferences';

interface ProfessionViewProps {
  linkedIn: LinkedInData | null;
  preferences: UserPreferences;
  onImport: (data: LinkedInData) => void;
  onClear: () => void;
  onPreferencesChange: (p: UserPreferences) => void;
  onGenerateCv: (job: ProfessionJobRecord) => void;
  onViewCv: (job: ProfessionJobRecord) => void;
  onGoToHistory: () => void;
}

export function ProfessionView({
  linkedIn,
  preferences,
  onImport,
  onClear,
  onPreferencesChange,
  onGenerateCv,
  onViewCv,
  onGoToHistory,
}: ProfessionViewProps) {
  const { jobs, loading, error, profileSummary, tagFilter, blockedToday, setTagFilter, search, reset, removeJob, hasSearched } =
    useProfessionSearch();

  const countdown = useCountdown(blockedToday);

  const allTags = [...new Set(jobs.flatMap((j) => j.skills))];
  const filtered = tagFilter === 'all' ? jobs : jobs.filter((j) => j.skills.includes(tagFilter));
  const locationReady = preferences.modality === 'remote' || !!preferences.location;

  function handleSearch() {
    if (!linkedIn) return;
    search(linkedIn, preferences);
  }

  return (
    <div className="profession-view">

      {/* ── Sticky search nav ── */}
      <div className="search-nav">
        {!linkedIn && (
          <div className="search-nav-linkedin">
            <LinkedInImport data={null} onImport={onImport} onClear={onClear} />
          </div>
        )}
        <div className="search-nav-prefs">
          <PreferencesPanel preferences={preferences} onChange={onPreferencesChange} />
        </div>
        <button
          className={`search-btn search-btn--nav${blockedToday ? ' search-btn--countdown' : ''}`}
          disabled={blockedToday || !linkedIn || !locationReady || loading}
          onClick={handleSearch}
        >
          {loading
            ? 'buscando...'
            : blockedToday
              ? `disponível em ${countdown}`
              : !linkedIn
                ? 'importe o LinkedIn'
                : !locationReady
                  ? 'configure localização'
                  : 'buscar vagas'}
        </button>
        {blockedToday && (
          <div className="search-limit-msg search-limit-msg--nav">
            <span>Limite diário atingido. Recarrega à meia-noite.</span>
            <button className="search-limit-history" onClick={onGoToHistory}>
              Ver histórico →
            </button>
          </div>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ paddingTop: 64, display: 'flex', justifyContent: 'center' }}>
          <div className="loading-bar">
            <div className="loading-step">
              <div className="dot" />
              analisando seu perfil profissional...
            </div>
            <div className="loading-step">
              <div className="dot" style={{ animationDelay: '0.3s' }} />
              buscando oportunidades compatíveis...
            </div>
          </div>
        </div>
      )}

      {/* ── Hero (only before first search) ── */}
      {!loading && !hasSearched && (
        <div className="hero">
          <h1>
            Vagas feitas<br />
            para a sua <span className="accent">carreira</span>
          </h1>
          <p className="subtitle">
            Conecte seu LinkedIn. A IA analisa seu histórico profissional
            para encontrar vagas em qualquer área que combinam com você.
          </p>
          {!blockedToday && error && <div className="error-msg" style={{ marginTop: 16 }}>{error}</div>}
        </div>
      )}

      {/* ── Results ── */}
      {!loading && hasSearched && (
        <div>
          {profileSummary && (
            <div className="profession-context">
              <span className="profession-context-title">Vagas recomendadas para você</span>
              <span className="profession-context-sub">{profileSummary}</span>
              <span className="profession-context-hint">Baseado no seu perfil do LinkedIn</span>
            </div>
          )}

          {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="jobs-section">
            <TagFilterBar
              tags={allTags}
              active={tagFilter}
              count={filtered.length}
              onChange={setTagFilter}
            />
            <div className="jobs-grid">
              {filtered.length === 0 ? (
                <div className="empty">
                  <p>Nenhuma vaga encontrada com esses filtros.</p>
                </div>
              ) : (
                filtered.map((job, i) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    index={i}
                    match={job.match}
                    onGenerateCv={() => onGenerateCv(job)}
                    onViewCv={() => onViewCv(job)}
                    onLike={(_j, category) => likeKeyword(category)}
                    onBlock={(_j, category) => { blockKeyword(category); removeJob(job.id); }}
                  />
                ))
              )}
            </div>
          </div>

          <div className="profession-actions-bar">
            {!blockedToday && (
              <button className="profession-reset-btn" onClick={reset}>
                Ajustar configurações e buscar novamente
              </button>
            )}
            <button className="history-link-btn" onClick={onGoToHistory}>Ver historico de vagas</button>
          </div>
        </div>
      )}

    </div>
  );
}
