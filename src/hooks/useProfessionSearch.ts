import { useState, useEffect, useRef } from 'react';
import { LinkedInData, ProfessionJobRecord, UserPreferences } from '../types';
import { fetchProfessionJobs } from '../services/professionJobs';

interface UseProfessionSearchReturn {
  jobs: ProfessionJobRecord[];
  loading: boolean;
  error: string;
  profileSummary: string;
  tagFilter: string;
  setTagFilter: (tag: string) => void;
  removeJob: (id: string) => void;
}

export function useProfessionSearch(
  linkedIn: LinkedInData | null,
  preferences?: UserPreferences
): UseProfessionSearchReturn {
  const [jobs, setJobs] = useState<ProfessionJobRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileSummary, setProfileSummary] = useState('');
  const [tagFilter, setTagFilter] = useState('all');

  const linkedInKey = linkedIn
    ? `${linkedIn.positions.length}:${linkedIn.education.length}:${linkedIn.positions[0]?.company ?? ''}`
    : null;
  // re-fetch when linkedin data OR preferences change
  const prefsKey = preferences ? JSON.stringify(preferences) : '';
  const stableKey = linkedInKey ? `${linkedInKey}::${prefsKey}` : null;
  const prevKey = useRef<string | null>(undefined as unknown as null);

  useEffect(() => {
    if (stableKey === prevKey.current) return;
    prevKey.current = stableKey;

    if (!linkedIn) {
      setJobs([]);
      setProfileSummary('');
      return;
    }

    setLoading(true);
    setError('');
    setJobs([]);
    setTagFilter('all');

    fetchProfessionJobs(linkedIn, preferences)
      .then((result) => {
        setJobs(result.jobs);
        setProfileSummary(result.profileSummary);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKey]);

  function removeJob(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  return { jobs, loading, error, profileSummary, tagFilter, setTagFilter, removeJob };
}
