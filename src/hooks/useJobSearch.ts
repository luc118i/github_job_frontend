import { useState } from 'react';
import { Profile, JobRecord, Step, LevelFilter, UserPreferences } from '../types';
import { fetchGitHubUser, fetchGitHubRepos, extractSkills } from '../services/github';
import { searchJobs } from '../services/jobs';

interface UseJobSearchReturn {
  profile: Profile | null;
  jobs: JobRecord[];
  loading: boolean;
  step: Step;
  error: string;
  filter: LevelFilter;
  setFilter: (level: LevelFilter) => void;
  search: (username: string, preferences?: UserPreferences) => Promise<void>;
  removeJob: (id: string) => void;
}

export function useJobSearch(): UseJobSearchReturn {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<LevelFilter>('all');

  async function search(username: string, preferences?: UserPreferences) {
    if (!username.trim()) return;
    setLoading(true);
    setError('');
    setJobs([]);
    setProfile(null);
    setStep('profile');

    try {
      const [user, repos] = await Promise.all([
        fetchGitHubUser(username.trim()),
        fetchGitHubRepos(username.trim()),
      ]);
      const skills = extractSkills(repos);
      const currentProfile: Profile = { user, repos, skills };
      setProfile(currentProfile);
      setStep('jobs');

      const { jobs: foundJobs } = await searchJobs(currentProfile, preferences);
      setJobs(foundJobs.filter((j) => !j.dismissed));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao buscar perfil.');
    } finally {
      setLoading(false);
    }
  }

  function removeJob(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  return { profile, jobs, loading, step, error, filter, setFilter, search, removeJob };
}
