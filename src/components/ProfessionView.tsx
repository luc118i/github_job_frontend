import { LinkedInData, ProfessionJobRecord, UserPreferences } from '../types';
import { LinkedInImport } from './LinkedInImport';
import { PreferencesPanel } from './PreferencesPanel';
import { TagFilterBar } from './TagFilterBar';
import { JobCard } from './JobCard';
import { useProfessionSearch } from '../hooks/useProfessionSearch';
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

  const allTags = [...new Set(jobs.flatMap((j) => j.skills))];
  const filtered = tagFilter === 'all' ? jobs : jobs.filter((j) => j.skills.includes(tagFilter));

  function handleSearch() {
    if (!linkedIn) return;
    search(linkedIn, preferences);
  }

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="cv-page-loading" style={{ position: 'static', flex: 'none', paddingTop: 64 }}>
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
    );
  }

  // ── Results ───────────────────────────────────────────────
  if (hasSearched) {
    return (
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
    );
  }

  // ── Config form (default) ─────────────────────────────────
  return (
    <div className="profession-config">
      <div className="hero">
        <h1>
          Vagas feitas<br />
          para a sua <span className="accent">carreira</span>
        </h1>
        <p className="subtitle">
          Conecte seu LinkedIn. A IA analisa seu histórico profissional
          para encontrar vagas em qualquer área que combinam com você.
        </p>
      </div>

      <div className="search-wrapper">
        <div className="linkedin-section">
          <LinkedInImport data={linkedIn} onImport={onImport} onClear={onClear} />
        </div>
        <PreferencesPanel
          preferences={preferences}
          onChange={onPreferencesChange}
          defaultOpen
        />
        {blockedToday ? (
          <div className="search-blocked">
            <p className="search-blocked-msg">Você ja realizou uma busca hoje. Volte amanha para uma nova busca.</p>
            <button className="history-link-btn" onClick={onGoToHistory}>Ver historico de vagas</button>
          </div>
        ) : (
          <>
            <button
              className="search-btn"
              disabled={!linkedIn || !(preferences.modality === 'remote' || !!preferences.location)}
              onClick={handleSearch}
            >
              {!linkedIn
                ? 'importe o LinkedIn para continuar'
                : !(preferences.modality === 'remote' || !!preferences.location)
                  ? 'informe sua localização para buscar'
                  : 'buscar vagas'}
            </button>
            {error && <div className="error-msg">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}
