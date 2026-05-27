import { useState } from 'react';
import { CareerProfile, LinkedInData, ProfessionJobRecord, UserPreferences } from '../types';
import { fetchProfessionJobs, fetchJobsByQuery } from '../services/professionJobs';
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
  search: (linkedIn: LinkedInData, preferences?: UserPreferences, careerProfile?: CareerProfile | null) => Promise<void>;
  searchByQuery: (query: string, preferences?: UserPreferences, careerProfile?: CareerProfile | null) => Promise<void>;
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

  async function search(linkedIn: LinkedInData, preferences?: UserPreferences, careerProfile?: CareerProfile | null) {
    if (!canSearch('profession')) {
      setBlockedToday(true);
      return;
    }
    setLoading(true);
    setError('');
    setJobs([]);
    setTagFilter('all');

    try {
      const result = await fetchProfessionJobs(linkedIn, preferences, careerProfile);
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

  async function searchByQuery(query: string, preferences?: UserPreferences, careerProfile?: CareerProfile | null) {
    if (!canSearch('profession')) {
      setBlockedToday(true);
      return;
    }
    setLoading(true);
    setError('');
    setJobs([]);
    setTagFilter('all');
    try {
      const result = await fetchJobsByQuery(query, preferences, careerProfile);
      setJobs(result.jobs);
      setProfileSummary(result.profileSummary);
      setHasSearched(true);
      markSearched('profession');
      setRemaining(remainingSearches('profession'));
      setBlockedToday(!canSearch('profession'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao buscar vagas';
      console.error('[searchByQuery] erro:', msg);
      setError(msg);
      setHasSearched(true); // mostra a seção de resultados mesmo com erro
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

  return { jobs, loading, error, profileSummary, tagFilter, blockedToday, remaining, setTagFilter, search, searchByQuery, reset, removeJob, hasSearched };
}
