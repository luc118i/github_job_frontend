import { useState } from 'react';
import { LinkedInData, ProfessionJobRecord, UserPreferences } from '../types';
import { fetchProfessionJobs } from '../services/professionJobs';

interface UseProfessionSearchReturn {
  jobs: ProfessionJobRecord[];
  loading: boolean;
  error: string;
  profileSummary: string;
  tagFilter: string;
  setTagFilter: (tag: string) => void;
  search: (linkedIn: LinkedInData, preferences?: UserPreferences) => Promise<void>;
  reset: () => void;
  hasSearched: boolean;
}

export function useProfessionSearch(): UseProfessionSearchReturn {
  const [jobs, setJobs] = useState<ProfessionJobRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileSummary, setProfileSummary] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [hasSearched, setHasSearched] = useState(false);

  async function search(linkedIn: LinkedInData, preferences?: UserPreferences) {
    setLoading(true);
    setError('');
    setJobs([]);
    setTagFilter('all');

    try {
      const result = await fetchProfessionJobs(linkedIn, preferences);
      setJobs(result.jobs);
      setProfileSummary(result.profileSummary);
      setHasSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao buscar vagas');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setJobs([]);
    setProfileSummary('');
    setError('');
    setHasSearched(false);
    setTagFilter('all');
  }

  return { jobs, loading, error, profileSummary, tagFilter, setTagFilter, search, reset, hasSearched };
}
