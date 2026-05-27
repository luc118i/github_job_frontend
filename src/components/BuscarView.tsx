import { CareerProfile, ProfessionJobRecord, UserPreferences } from '../types';
import { View } from './TabNav';
import { LandingSearch } from './LandingSearch';
import { JobCard } from './JobCard';
import { TagFilterBar } from './TagFilterBar';
import { useProfessionSearch } from '../hooks/useProfessionSearch';
import { blockKeyword, likeKeyword, blockSource, likeSource } from '../utils/jobPreferences';

interface BuscarViewProps {
  careerProfile: CareerProfile | null;
  preferences: UserPreferences;
  onNavigate: (v: View) => void;
  onGenerateCv: (job: ProfessionJobRecord) => void;
  onViewCv: (job: ProfessionJobRecord) => void;
}

export function BuscarView({
  careerProfile,
  preferences,
  onNavigate,
  onGenerateCv,
  onViewCv,
}: BuscarViewProps) {
  const {
    jobs,
    loading,
    error,
    profileSummary,
    tagFilter,
    blockedToday,
    setTagFilter,
    searchByQuery,
    reset,
    removeJob,
    hasSearched,
  } = useProfessionSearch();

  function handleSearch(query: string) {
    searchByQuery(query, preferences, careerProfile);
  }

  function handleDailySearch() {
    if (!careerProfile) {
      onNavigate('outros');
      return;
    }
    const q =
      (careerProfile.transitionReady && careerProfile.transitionTarget)
        ? careerProfile.transitionTarget
        : (careerProfile.desiredAreas?.[0] || careerProfile.careerGoals || 'vagas recomendadas');
    searchByQuery(q, preferences, careerProfile);
  }

  const allTags = [...new Set(jobs.flatMap((j) => j.skills))];
  const filtered =
    tagFilter === 'all' ? jobs : jobs.filter((j) => j.skills.includes(tagFilter));

  return (
    <>
      <LandingSearch
        onNavigate={onNavigate}
        onSearch={handleSearch}
        onDailySearch={handleDailySearch}
        onNewSearch={reset}
        hasProfile={!!careerProfile}
        loading={loading}
        hasSearched={hasSearched}
        dailyDone={blockedToday}
      />

      {/* ── Loading ── */}
      {loading && (
        <div className="buscar-loading">
          <div className="loading-bar">
            <div className="loading-step">
              <div className="dot" />
              buscando vagas...
            </div>
            <div className="loading-step">
              <div className="dot" style={{ animationDelay: '0.3s' }} />
              verificando fontes e links...
            </div>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {!loading && hasSearched && (
        <div className="buscar-results">
          {profileSummary && (
            <div className="buscar-summary">
              <span className="buscar-summary-label">Resultados para</span>
              <span className="buscar-summary-text">{profileSummary}</span>
            </div>
          )}

          {error && (
            <div className="error-msg" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          {filtered.length > 0 ? (
            <>
              <TagFilterBar
                tags={allTags}
                active={tagFilter}
                count={filtered.length}
                onChange={setTagFilter}
              />
              <div className="jobs-grid buscar-jobs-grid">
                {filtered.map((job, i) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    index={i}
                    match={job.match}
                    onGenerateCv={() => onGenerateCv(job)}
                    onViewCv={() => onViewCv(job)}
                    onLike={(_j, cat) => likeKeyword(cat)}
                    onBlock={(_j, cat) => {
                      blockKeyword(cat);
                      removeJob(job.id);
                    }}
                    onLikeSource={(_j, src) => likeSource(src)}
                    onBlockSource={(_j, src) => blockSource(src)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="buscar-empty">
              Nenhuma vaga encontrada. Tente outro termo ou ajuste os filtros.
            </div>
          )}
        </div>
      )}
    </>
  );
}
