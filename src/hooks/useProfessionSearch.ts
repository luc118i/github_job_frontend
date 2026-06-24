import { useState } from 'react';
import { CareerProfile, LinkedInData, ProfessionJobRecord, UserPreferences } from '../types';
import { fetchProfessionJobs, fetchJobsByQuery } from '../services/professionJobs';

interface UseProfessionSearchReturn {
  jobs: ProfessionJobRecord[];
  bonusJobs: ProfessionJobRecord[];
  loading: boolean;
  error: string;
  profileSummary: string;
  tagFilter: string;
  blockedToday: boolean;
  remaining: number;
  setTagFilter: (tag: string) => void;
  search: (linkedIn: LinkedInData, preferences?: UserPreferences, careerProfile?: CareerProfile | null, githubUsername?: string | null) => Promise<void>;
  searchByQuery: (query: string, preferences?: UserPreferences, careerProfile?: CareerProfile | null, linkedIn?: LinkedInData | null) => Promise<void>;
  reset: () => void;
  removeJob: (id: string) => void;
  hasSearched: boolean;
}

export function useProfessionSearch(): UseProfessionSearchReturn {
  const [jobs, setJobs] = useState<ProfessionJobRecord[]>([]);
  const [bonusJobs, setBonusJobs] = useState<ProfessionJobRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileSummary, setProfileSummary] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [hasSearched, setHasSearched] = useState(false);

  async function search(linkedIn: LinkedInData, preferences?: UserPreferences, careerProfile?: CareerProfile | null, githubUsername?: string | null) {
    setLoading(true);
    setError('');
    setJobs([]);
    setBonusJobs([]);
    setTagFilter('all');

    try {
      const result = await fetchProfessionJobs(linkedIn, preferences, careerProfile, githubUsername);
      setJobs(result.jobs);
      setBonusJobs(result.bonusJobs ?? []);
      setProfileSummary(result.profileSummary);
      setHasSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao buscar vagas');
    } finally {
      setLoading(false);
    }
  }

  async function searchByQuery(query: string, preferences?: UserPreferences, careerProfile?: CareerProfile | null, linkedIn?: LinkedInData | null) {
    setLoading(true);
    setError('');
    setJobs([]);
    setBonusJobs([]);
    setTagFilter('all');
    try {
      const result = await fetchJobsByQuery(query, preferences, careerProfile, linkedIn);
      setJobs(result.jobs);
      setBonusJobs(result.bonusJobs ?? []);
      setProfileSummary(result.profileSummary);
      setHasSearched(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar vagas';
      console.error('[searchByQuery] erro:', msg);
      setError(msg);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setJobs([]);
    setBonusJobs([]);
    setProfileSummary('');
    setError('');
    setHasSearched(false);
    setTagFilter('all');
  }

  function removeJob(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setBonusJobs((prev) => prev.filter((j) => j.id !== id));
  }

  return { jobs, bonusJobs, loading, error, profileSummary, tagFilter, blockedToday: false, remaining: 999, setTagFilter, search, searchByQuery, reset, removeJob, hasSearched };
}
