import { LinkedInData, ProfessionSearchResult } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function fetchProfessionJobs(linkedIn: LinkedInData): Promise<ProfessionSearchResult> {
  const res = await fetch(`${API_URL}/profession-jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ linkedIn }),
  });
  if (!res.ok) throw new Error('Erro ao buscar vagas');
  return res.json() as Promise<ProfessionSearchResult>;
}
