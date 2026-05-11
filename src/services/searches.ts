import { JobFeedItem } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function fetchJobFeed(): Promise<JobFeedItem[]> {
  const res = await fetch(`${API_URL}/searches`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao carregar o histórico de buscas. Tente novamente.');
  }
  const data = (await res.json()) as { jobs: JobFeedItem[] };
  return data.jobs;
}
