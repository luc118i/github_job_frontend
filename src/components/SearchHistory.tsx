import { useEffect, useState } from 'react';
import { SearchRecord, LevelFilter, JobRecord, Profile, LinkedInData } from '../types';
import { fetchSearchHistory } from '../services/searches';
import { fetchGitHubUser, fetchGitHubRepos, extractSkills } from '../services/github';
import { JobCard } from './JobCard';
import { FilterBar } from './FilterBar';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

interface SearchEntryProps {
  record: SearchRecord;
  onGenerateCv: (job: JobRecord, profile: Profile) => void;
}

function SearchEntry({ record, onGenerateCv }: SearchEntryProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<LevelFilter>('all');
  const [profileLoading, setProfileLoading] = useState(false);

  const filtered = filter === 'all'
    ? record.jobs
    : record.jobs.filter((j) => j.level === filter);

  const seenCount = record.jobs.filter((j) => j.seen).length;

  async function handleGenerateCv(job: JobRecord) {
    if (!record.github_username) return;
    setProfileLoading(true);
    try {
      const [user, repos] = await Promise.all([
        fetchGitHubUser(record.github_username),
        fetchGitHubRepos(record.github_username),
      ]);
      onGenerateCv(job, { user, repos, skills: extractSkills(repos) });
    } finally {
      setProfileLoading(false);
    }
  }

  return (
    <div className="history-entry">
      <div className="history-header" onClick={() => setOpen(!open)}>
        <div className="history-meta">
          <span className="history-user">
            {record.github_username ? `@${record.github_username}` : '—'}
          </span>
          <span className="history-date">{formatDate(record.created_at)}</span>
        </div>
        <div className="history-stats">
          <span className="stat">{record.jobs.length} vagas</span>
          {seenCount > 0 && <span className="stat seen-stat">{seenCount} vistos</span>}
          <span className="expand-icon">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {record.skills.length > 0 && (
        <div className="history-skills">
          {record.skills.slice(0, 6).map((s) => (
            <span key={s} className="skill-chip">{s}</span>
          ))}
        </div>
      )}

      {open && (
        <div className="history-jobs">
          {profileLoading && (
            <div className="loading-step" style={{ padding: '8px 0 4px' }}>
              <div className="dot" /> buscando perfil...
            </div>
          )}
          <FilterBar active={filter} count={filtered.length} onChange={setFilter} />
          <div className="jobs-grid">
            {filtered.map((job, i) => (
              <JobCard
                key={job.id}
                job={job}
                index={i}
                onGenerateCv={record.github_username ? handleGenerateCv : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SearchHistoryProps {
  linkedInData: LinkedInData | null;
  onGenerateCv: (job: JobRecord, profile: Profile) => void;
}

export function SearchHistory({ linkedInData: _linkedInData, onGenerateCv }: SearchHistoryProps) {
  const [searches, setSearches] = useState<SearchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSearchHistory()
      .then(setSearches)
      .catch(() => setError('Erro ao carregar histórico.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading-bar" style={{ marginTop: 48 }}>
        <div className="loading-step"><div className="dot" /> carregando histórico</div>
      </div>
    );
  }

  if (error) return <div className="error-msg">{error}</div>;

  if (searches.length === 0) {
    return <div className="empty" style={{ marginTop: 48 }}>Nenhuma busca realizada ainda.</div>;
  }

  return (
    <div className="history-list">
      {searches.map((s) => (
        <SearchEntry key={s.id} record={s} onGenerateCv={onGenerateCv} />
      ))}
    </div>
  );
}
