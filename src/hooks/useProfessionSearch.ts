import { useState } from 'react';
import { LinkedInData, ProfessionJobRecord, UserPreferences } from '../types';
import { fetchProfessionJobs } from '../services/professionJobs';
import { canSearch, markSearched } from '../utils/dailyLimit';

interface UseProfessionSearchReturn {
  jobs: ProfessionJobRecord[];
  loading: boolean;
  error: string;
  profileSummary: string;
  tagFilter: string;
  blockedToday: boolean;
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
  const [blockedToday, setBlockedToday] = useState(!canSearch('profession'));

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
      setBlockedToday(true);
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

  return { jobs, loading, error, profileSummary, tagFilter, blockedToday, setTagFilter, search, reset, hasSearched };
}
