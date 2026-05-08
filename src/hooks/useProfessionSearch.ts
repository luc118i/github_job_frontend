import { useState } from 'react';
import { LinkedInData, ProfessionJobRecord, UserPreferences } from '../types';
import { fetchProfessionJobs } from '../services/professionJobs';
import { canSearch, markSearched, remainingSearches } from '../utils/dailyLimit';

interface UseProfessionSearchReturn {
  jobs: ProfessionJobRecord[];
  loading: boolean;
  error: string;
  profileSummary: string;
  tagFilter: string;
  blockedToday: boolean;
  remaining: number;
  setTagFilter: (tag: string) => void;
  search: (linkedIn: LinkedInData, preferences?: UserPreferences) => Promise<void>;
  reset: () => void;
  removeJob: (id: string) => void;
  hasSearched: boolean;
}

export function useProfessionSearch(): UseProfessionSearchReturn {
  const [jobs, setJobs] = useState<ProfessionJobRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileSummary, setProfileSummary] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [hasSearched, setHasSearched] = useState(false);
  const [blockedToday, setBlockedToday] = useState(!canSearch('profession'));
  const [remaining, setRemaining] = useState(remainingSearches('profession'));

  async function search(linkedIn: LinkedInData, preferences?: UserPreferences) {
    if (!canSearch('profession')) {
      setBlockedToday(true);
      return;
    }
    setLoading(true);
    setError('');
    setJobs([]);
    setTagFilter('all');

    try {
      const result = await fetchProfessionJobs(linkedIn, preferences);
      setJobs(result.jobs);
      setProfileSummary(result.profileSummary);
      setHasSearched(true);
      markSearched('profession');
      setRemaining(remainingSearches('profession'));
      setBlockedToday(!canSearch('profession'));
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

  function removeJob(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  return { jobs, loading, error, profileSummary, tagFilter, blockedToday, remaining, setTagFilter, search, reset, removeJob, hasSearched };
}
