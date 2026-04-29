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
          Ajustar configurações e buscar novamente
        </button>
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
        <button
          className="search-btn"
          disabled={!linkedIn}
          onClick={handleSearch}
        >
          {linkedIn ? 'buscar vagas' : 'importe o LinkedIn para continuar'}
        </button>
        {error && <div className="error-msg">{error}</div>}
      </div>
    </div>
  );
}
