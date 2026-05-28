import { CareerProfile, LinkedInData, ProfessionSearchResult, UserPreferences } from '../types';
import { getBlockedKeywords, getLikedKeywords, getBlockedSources, getLikedSources } from '../utils/jobPreferences';
import { getToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function postProfessionJobs(body: Record<string, unknown>): Promise<ProfessionSearchResult> {
  const token = getToken();
  const res = await fetch(`${API_URL}/profession-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao buscar vagas');
  }
  return res.json() as Promise<ProfessionSearchResult>;
}

export async function fetchProfessionJobs(
  linkedIn: LinkedInData,
  preferences?: UserPreferences,
  careerProfile?: CareerProfile | null,
  githubUsername?: string | null,
): Promise<ProfessionSearchResult> {
  return postProfessionJobs({
    linkedIn,
    preferences,
    blockedKeywords: getBlockedKeywords(),
    likedKeywords: getLikedKeywords(),
    blockedSources: getBlockedSources(),
    likedSources: getLikedSources(),
    ...(careerProfile ? { careerProfile } : {}),
    ...(githubUsername ? { githubUsername } : {}),
  });
}

export async function fetchJobsByQuery(
  query: string,
  preferences?: UserPreferences,
  careerProfile?: CareerProfile | null,
): Promise<ProfessionSearchResult> {
  return postProfessionJobs({
    query,
    preferences,
    blockedKeywords: getBlockedKeywords(),
    likedKeywords: getLikedKeywords(),
    blockedSources: getBlockedSources(),
    likedSources: getLikedSources(),
    ...(careerProfile ? { careerProfile } : {}),
  });
}
