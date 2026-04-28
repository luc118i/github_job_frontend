import { useEffect, useMemo, useState } from 'react';
import { JobFeedItem, LinkedInData, Profile } from '../types';
import { fetchJobFeed } from '../services/searches';
import { fetchGitHubUser, fetchGitHubRepos, extractSkills } from '../services/github';
import { JobCard } from './JobCard';

type DateGroup = 'hoje' | 'semana' | 'anteriores';
type LevelFilter = 'all' | 'Junior' | 'Pleno' | 'Senior';
type RemoteFilter = 'all' | 'remote' | 'presencial';
type SeenFilter = 'all' | 'unseen' | 'seen';

interface HistoryFilters {
  text: string;
  level: LevelFilter;
  remote: RemoteFilter;
  location: string;
  tag: string;
  seen: SeenFilter;
}

function getGroup(iso: string): DateGroup {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return 'hoje';
  if (diffDays < 7) return 'semana';
  return 'anteriores';
}

const GROUP_LABELS: Record<DateGroup, string> = {
  hoje: 'Hoje',
  semana: 'Esta semana',
  anteriores: 'Anteriores',
};

const GROUP_ORDER: DateGroup[] = ['hoje', 'semana', 'anteriores'];

// ── Filter bar ──────────────────────────────────────────────

interface HistoryFilterBarProps {
  filters: HistoryFilters;
  allTags: string[];
  allLocations: string[];
  total: number;
  filtered: number;
  onChange: (f: HistoryFilters) => void;
}

function HistoryFilterBar({ filters, allTags, allLocations, total, filtered, onChange }: HistoryFilterBarProps) {
  const levels: LevelFilter[] = ['all', 'Junior', 'Pleno', 'Senior'];
  const remotes: { value: RemoteFilter; label: string }[] = [
    { value: 'all', label: 'qualquer local' },
    { value: 'remote', label: 'remoto' },
    { value: 'presencial', label: 'presencial' },
  ];
  const seenOpts: { value: SeenFilter; label: string }[] = [
    { value: 'all', label: 'todas' },
    { value: 'unseen', label: 'não vistas' },
    { value: 'seen', label: 'vistas' },
  ];

  function set<K extends keyof HistoryFilters>(key: K, val: HistoryFilters[K]) {
    onChange({ ...filters, [key]: val });
  }

  return (
    <div className="history-filter-bar">
      <div className="history-filter-top">
        <span className="section-title">
          {filtered === total ? `${total} vagas` : `${filtered} de ${total} vagas`}
        </span>
        <div className="history-filter-seen-row">
          {seenOpts.map((o) => (
            <button
              key={o.value}
              className={`filter-tab ${filters.seen === o.value ? 'active' : ''}`}
              onClick={() => set('seen', o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="history-filter-controls">
        <input
          className="history-filter-search"
          type="text"
          placeholder="buscar por título ou empresa..."
          value={filters.text}
          onChange={(e) => set('text', e.target.value)}
        />

        <div className="history-filter-row">
          <div className="filter-tabs">
            {levels.map((l) => (
              <button
                key={l}
                className={`filter-tab ${filters.level === l ? 'active' : ''}`}
                onClick={() => set('level', l)}
              >
                {l === 'all' ? 'nível' : l}
              </button>
            ))}
          </div>

          <div className="filter-tabs">
            {remotes.map((r) => (
              <button
                key={r.value}
                className={`filter-tab ${filters.remote === r.value ? 'active' : ''}`}
                onClick={() => set('remote', r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {allLocations.length > 0 && (
          <div className="history-filter-tags">
            <span className="filter-group-label">local</span>
            <button
              className={`filter-tag-chip ${filters.location === '' ? 'active' : ''}`}
              onClick={() => set('location', '')}
            >
              todos
            </button>
            {allLocations.map((loc) => (
              <button
                key={loc}
                className={`filter-tag-chip ${filters.location === loc ? 'active' : ''}`}
                onClick={() => set('location', filters.location === loc ? '' : loc)}
              >
                {loc}
              </button>
            ))}
          </div>
        )}

        {allTags.length > 0 && (
          <div className="history-filter-tags">
            <span className="filter-group-label">skills</span>
            <button
              className={`filter-tag-chip ${filters.tag === '' ? 'active' : ''}`}
              onClick={() => set('tag', '')}
            >
              todas
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                className={`filter-tag-chip ${filters.tag === t ? 'active' : ''}`}
                onClick={() => set('tag', filters.tag === t ? '' : t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Feed card ────────────────────────────────────────────────

interface FeedCardProps {
  job: JobFeedItem;
  index: number;
  linkedInData: LinkedInData | null;
  onGenerateCv: (job: JobFeedItem, profile: Profile) => void;
}

function FeedCard({ job, index, linkedInData, onGenerateCv }: FeedCardProps) {
  const [profileLoading, setProfileLoading] = useState(false);
  const isLinkedIn = !job.github_username;

  async function handleGenerateCv() {
    if (isLinkedIn) {
      const syntheticProfile: Profile = {
        user: {
          login: '',
          name: linkedInData?.positions[0]?.title ?? 'Candidato',
          bio: null,
          avatar_url: '',
          followers: 0,
          public_repos: 0,
        },
        repos: [],
        skills: job.skills,
      };
      onGenerateCv(job, syntheticProfile);
      return;
    }
    setProfileLoading(true);
    try {
      const [user, repos] = await Promise.all([
        fetchGitHubUser(job.github_username!),
        fetchGitHubRepos(job.github_username!),
      ]);
      onGenerateCv(job, { user, repos, skills: extractSkills(repos) });
    } finally {
      setProfileLoading(false);
    }
  }

  return (
    <div className="feed-card-wrapper">
      <div className="feed-card-context">
        {isLinkedIn ? 'via LinkedIn' : `via @${job.github_username}`}
        {profileLoading && <span className="feed-card-loading"> · buscando perfil...</span>}
      </div>
      <JobCard
        job={job}
        index={index}
        onGenerateCv={handleGenerateCv}
      />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

interface SearchHistoryProps {
  linkedInData: LinkedInData | null;
  onGenerateCv: (job: JobFeedItem, profile: Profile) => void;
}

const DEFAULT_FILTERS: HistoryFilters = {
  text: '',
  level: 'all',
  remote: 'all',
  location: '',
  tag: '',
  seen: 'all',
};

export function SearchHistory({ linkedInData, onGenerateCv }: SearchHistoryProps) {
  const [jobs, setJobs] = useState<JobFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    fetchJobFeed()
      .then(setJobs)
      .catch(() => setError('Erro ao carregar histórico.'))
      .finally(() => setLoading(false));
  }, []);

  // Pre-populate text filter with LinkedIn job title
  useEffect(() => {
    if (linkedInData?.positions[0]?.title && filters.text === '') {
      // Don't auto-fill — let user decide, but keep hint via placeholder
    }
  }, [linkedInData]);

  const allTags = useMemo(() => {
    const freq = new Map<string, number>();
    jobs.forEach((j) => j.skills.forEach((s) => freq.set(s, (freq.get(s) ?? 0) + 1)));
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag);
  }, [jobs]);

  const allLocations = useMemo(() => {
    const freq = new Map<string, number>();
    jobs.forEach((j) => {
      if (j.location) freq.set(j.location, (freq.get(j.location) ?? 0) + 1);
    });
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([loc]) => loc);
  }, [jobs]);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (filters.text) {
        const q = filters.text.toLowerCase();
        if (!j.title.toLowerCase().includes(q) && !j.company.toLowerCase().includes(q)) return false;
      }
      if (filters.level !== 'all' && j.level !== filters.level) return false;
      if (filters.remote === 'remote' && !j.remote) return false;
      if (filters.remote === 'presencial' && j.remote) return false;
      if (filters.location && j.location !== filters.location) return false;
      if (filters.tag && !j.skills.includes(filters.tag)) return false;
      if (filters.seen === 'unseen' && j.seen) return false;
      if (filters.seen === 'seen' && !j.seen) return false;
      return true;
    });
  }, [jobs, filters]);

  if (loading) {
    return (
      <div className="loading-bar" style={{ marginTop: 48 }}>
        <div className="loading-step"><div className="dot" /> carregando vagas</div>
      </div>
    );
  }

  if (error) return <div className="error-msg">{error}</div>;

  if (jobs.length === 0) {
    return <div className="empty" style={{ marginTop: 48 }}>Nenhuma vaga encontrada ainda.</div>;
  }

  const jobIndex = new Map(filtered.map((job, i) => [job.id, i]));

  const grouped = GROUP_ORDER.reduce<Record<DateGroup, JobFeedItem[]>>(
    (acc, g) => ({ ...acc, [g]: [] }),
    { hoje: [], semana: [], anteriores: [] }
  );
  filtered.forEach((job) => grouped[getGroup(job.created_at)].push(job));

  return (
    <div>
      <HistoryFilterBar
        filters={filters}
        allTags={allTags}
        allLocations={allLocations}
        total={jobs.length}
        filtered={filtered.length}
        onChange={setFilters}
      />

      {filtered.length === 0 ? (
        <div className="empty" style={{ marginTop: 32 }}>Nenhuma vaga corresponde aos filtros.</div>
      ) : (
        <div className="feed-list">
          {GROUP_ORDER.filter((g) => grouped[g].length > 0).map((group) => (
            <section key={group} className="feed-group">
              <h3 className="feed-group-label">{GROUP_LABELS[group]}</h3>
              <div className="jobs-grid">
                {grouped[group].map((job) => (
                  <FeedCard
                    key={job.id}
                    job={job}
                    index={jobIndex.get(job.id) ?? 0}
                    linkedInData={linkedInData}
                    onGenerateCv={onGenerateCv}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
