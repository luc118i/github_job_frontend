import { LinkedInData, ProfessionJobRecord } from '../types';
import { LinkedInImport } from './LinkedInImport';
import { TagFilterBar } from './TagFilterBar';
import { JobCard } from './JobCard';
import { useProfessionSearch } from '../hooks/useProfessionSearch';

interface ProfessionViewProps {
  linkedIn: LinkedInData | null;
  onImport: (data: LinkedInData) => void;
  onClear: () => void;
  onGenerateCv: (job: ProfessionJobRecord) => void;
}

export function ProfessionView({ linkedIn, onImport, onClear, onGenerateCv }: ProfessionViewProps) {
  const {
    jobs,
    loading,
    error,
    profileSummary,
    tagFilter,
    setTagFilter,
    removeJob,
  } = useProfessionSearch(linkedIn);

  const allTags = [...new Set(jobs.flatMap((j) => j.skills))];
  const filtered =
    tagFilter === 'all' ? jobs : jobs.filter((j) => j.skills.includes(tagFilter));

  if (!linkedIn) {
    return (
      <div className="profession-empty">
        <p className="profession-empty-title">Conecte seu LinkedIn para começar</p>
        <p className="profession-empty-sub">
          Importamos seu perfil para encontrar oportunidades alinhadas ao seu momento de carreira.
        </p>
        <div className="profession-import-widget">
          <LinkedInImport data={null} onImport={onImport} onClear={onClear} />
        </div>
      </div>
    );
  }

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

  if (error) {
    return <div className="error-msg" style={{ marginTop: 24 }}>{error}</div>;
  }

  return (
    <div>
      {profileSummary && (
        <div className="profession-context">
          <span className="profession-context-title">Vagas recomendadas para você</span>
          <span className="profession-context-sub">{profileSummary}</span>
          <span className="profession-context-hint">Baseado no seu perfil do LinkedIn</span>
        </div>
      )}

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
              <p>Ainda não encontramos vagas ideais para seu perfil.</p>
              <p style={{ marginTop: 6 }}>Tente ajustar os filtros ou aguarde novas oportunidades.</p>
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
    </div>
  );
}
