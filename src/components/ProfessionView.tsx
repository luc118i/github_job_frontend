import { LinkedInData, ProfessionJobRecord, UserPreferences } from '../types';
import { LinkedInImport } from './LinkedInImport';
import { PreferencesPanel } from './PreferencesPanel';
import { TagFilterBar } from './TagFilterBar';
import { JobCard } from './JobCard';
import { useProfessionSearch } from '../hooks/useProfessionSearch';

interface ProfessionViewProps {
  linkedIn: LinkedInData | null;
  preferences: UserPreferences;
  onImport: (data: LinkedInData) => void;
  onClear: () => void;
  onPreferencesChange: (p: UserPreferences) => void;
  onGenerateCv: (job: ProfessionJobRecord) => void;
}

export function ProfessionView({
  linkedIn,
  preferences,
  onImport,
  onClear,
  onPreferencesChange,
  onGenerateCv,
}: ProfessionViewProps) {
  const { jobs, loading, error, profileSummary, tagFilter, setTagFilter, search, reset, hasSearched } =
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
                />
              ))
            )}
          </div>
        </div>

        <button className="profession-reset-btn" onClick={reset}>
          ← Ajustar configurações e buscar novamente
        </button>
      </div>
    );
  }

  // ── Config form (default) ─────────────────────────────────
  return (
    <div className="profession-config">
      <div className="profession-config-header">
        <h2 className="profession-config-title">Configure sua busca</h2>
        <p className="profession-config-sub">
          Importe seu LinkedIn e defina o que você está procurando para a IA encontrar vagas alinhadas ao seu perfil.
        </p>
      </div>

      <div className="profession-config-steps">
        <div className="profession-config-step">
          <span className="profession-step-num">1</span>
          <div className="profession-step-body">
            <span className="profession-step-label">Perfil LinkedIn</span>
            <LinkedInImport data={linkedIn} onImport={onImport} onClear={onClear} />
          </div>
        </div>

        <div className={`profession-config-step ${!linkedIn ? 'disabled' : ''}`}>
          <span className="profession-step-num">2</span>
          <div className="profession-step-body">
            <span className="profession-step-label">Preferências de busca</span>
            <PreferencesPanel
              preferences={preferences}
              onChange={onPreferencesChange}
              defaultOpen
            />
          </div>
        </div>
      </div>

      <button
        className="profession-search-btn"
        disabled={!linkedIn}
        onClick={handleSearch}
      >
        {linkedIn ? '→ Buscar vagas' : 'Importe o LinkedIn para continuar'}
      </button>

      {error && <div className="error-msg" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  );
}
