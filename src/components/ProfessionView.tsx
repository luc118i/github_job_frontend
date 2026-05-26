import { LinkedInData, ProfessionJobRecord, UserPreferences, CareerProfile } from '../types';
import { LinkedInImport } from './LinkedInImport';
import { PreferencesPanel } from './PreferencesPanel';
import { TagFilterBar } from './TagFilterBar';
import { JobCard } from './JobCard';
import { CareerChat } from './CareerChat';
import { CareerInsights } from './CareerInsights';
import { useProfessionSearch } from '../hooks/useProfessionSearch';
import { useCountdown } from '../hooks/useCountdown';
import { blockKeyword, likeKeyword, blockSource, likeSource } from '../utils/jobPreferences';

interface ProfessionViewProps {
  linkedIn: LinkedInData | null;
  preferences: UserPreferences;
  careerProfile: CareerProfile | null;
  onImport: (data: LinkedInData) => void;
  onClear: () => void;
  onPreferencesChange: (p: UserPreferences) => void;
  onCareerComplete: (profile: CareerProfile) => void;
  onCareerRedo: () => void;
  onGenerateCv: (job: ProfessionJobRecord) => void;
  onViewCv: (job: ProfessionJobRecord) => void;
  onGoToHistory: () => void;
}

export function ProfessionView({
  linkedIn,
  preferences,
  careerProfile,
  onImport,
  onClear,
  onPreferencesChange,
  onCareerComplete,
  onCareerRedo,
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

  // Show chat if no career profile yet and no search in progress
  const showChat = !careerProfile && !hasSearched && !loading;

  function handleSearch() {
    if (!linkedIn) return;
    search(linkedIn, preferences, careerProfile);
  }

  function handleCareerComplete(profile: CareerProfile) {
    onCareerComplete(profile);
  }

  return (
    <div className="profession-view">

      {/* ── Sticky search nav ── */}
      {!showChat && (
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
                ? `disponivel em ${countdown}`
                : !linkedIn
                  ? 'importe o LinkedIn'
                  : !locationReady
                    ? 'configure localizacao'
                    : 'buscar vagas'}
          </button>
          {blockedToday && (
            <div className="search-limit-msg search-limit-msg--nav">
              <span>Limite diario atingido. Recarrega a meia-noite.</span>
              <button className="search-limit-history" onClick={onGoToHistory}>
                Ver historico
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Career Chat (onboarding — only when no profile) ── */}
      {showChat && (
        <div className="career-chat-wrapper">
          <CareerChat onComplete={handleCareerComplete} />
        </div>
      )}

      {/* ── Career Insights (after chat completes) ── */}
      {careerProfile && !hasSearched && !loading && (
        <div className="career-insights-wrapper">
          <CareerInsights profile={careerProfile} onRedo={onCareerRedo} />

          {/* After profile is set, show the import + search controls */}
          <div className="career-post-insights">
            {!linkedIn && (
              <LinkedInImport data={null} onImport={onImport} onClear={onClear} />
            )}
            {linkedIn && (
              <div className="career-ready-row">
                <PreferencesPanel preferences={preferences} onChange={onPreferencesChange} />
                <button
                  className={`search-btn${blockedToday ? ' search-btn--countdown' : ''}`}
                  disabled={blockedToday || !locationReady || loading}
                  onClick={handleSearch}
                >
                  {blockedToday ? `disponivel em ${countdown}` : !locationReady ? 'configure localizacao' : 'buscar vagas'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ paddingTop: 64, display: 'flex', justifyContent: 'center' }}>
          <div className="loading-bar">
            <div className="loading-step">
              <div className="dot" />
              analisando seu perfil e potencial...
            </div>
            <div className="loading-step">
              <div className="dot" style={{ animationDelay: '0.3s' }} />
              buscando oportunidades alinhadas com quem voce e...
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {!loading && hasSearched && (
        <div>
          {/* Compact career insights bar on results screen */}
          {careerProfile && (
            <div className="career-results-bar">
              <CareerInsights profile={careerProfile} onRedo={() => { onCareerRedo(); reset(); }} />
            </div>
          )}

          {profileSummary && (
            <div className="profession-context">
              <span className="profession-context-title">Vagas recomendadas para voce</span>
              <span className="profession-context-sub">{profileSummary}</span>
              <span className="profession-context-hint">
                {careerProfile
                  ? 'Baseado no seu perfil do LinkedIn e na analise de carreira'
                  : 'Baseado no seu perfil do LinkedIn'}
              </span>
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
                    onLikeSource={(_j, src) => likeSource(src)}
                    onBlockSource={(_j, src) => blockSource(src)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="profession-actions-bar">
            {!blockedToday && (
              <button className="profession-reset-btn" onClick={reset}>
                Ajustar configuracoes e buscar novamente
              </button>
            )}
            <button className="history-link-btn" onClick={onGoToHistory}>Ver historico de vagas</button>
          </div>
        </div>
      )}

    </div>
  );
}
