import { useEffect, useState } from 'react';
import { JobFeedItem, LinkedInData, Profile } from '../types';
import { fetchJobFeed } from '../services/searches';
import { fetchGitHubUser, fetchGitHubRepos, extractSkills } from '../services/github';
import { JobCard } from './JobCard';

type DateGroup = 'hoje' | 'semana' | 'anteriores';

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

interface SearchHistoryProps {
  linkedInData: LinkedInData | null;
  onGenerateCv: (job: JobFeedItem, profile: Profile) => void;
}

export function SearchHistory({ linkedInData, onGenerateCv }: SearchHistoryProps) {
  const [jobs, setJobs] = useState<JobFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchJobFeed()
      .then(setJobs)
      .catch(() => setError('Erro ao carregar histórico.'))
      .finally(() => setLoading(false));
  }, []);

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

  const jobIndex = new Map(jobs.map((job, i) => [job.id, i]));

  const grouped = GROUP_ORDER.reduce<Record<DateGroup, JobFeedItem[]>>(
    (acc, g) => ({ ...acc, [g]: [] }),
    { hoje: [], semana: [], anteriores: [] }
  );
  jobs.forEach((job) => grouped[getGroup(job.created_at)].push(job));

  return (
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
  );
}
