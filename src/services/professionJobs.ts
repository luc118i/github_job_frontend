import { LinkedInData, ProfessionSearchResult, UserPreferences } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function fetchProfessionJobs(
  linkedIn: LinkedInData,
  preferences?: UserPreferences
): Promise<ProfessionSearchResult> {
  const res = await fetch(`${API_URL}/profession-jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ linkedIn, preferences }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao buscar vagas');
  }
  return res.json() as Promise<ProfessionSearchResult>;
}
