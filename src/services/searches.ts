import { JobFeedItem } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function fetchJobFeed(): Promise<JobFeedItem[]> {
  const res = await fetch(`${API_URL}/searches`);
  if (!res.ok) throw new Error('Erro ao carregar histórico');
  const data = (await res.json()) as { jobs: JobFeedItem[] };
  return data.jobs;
}
