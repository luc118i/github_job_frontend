import { JobFeedItem } from '../types';
import { getToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

/**
 * Busca o feed de vagas. scope='recent' (usado no "organizar") traz só a
 * última busca — e, se ela estiver vazia, as buscas do último mês. Sem scope,
 * retorna o histórico completo (usado na tela de histórico).
 */
export async function fetchJobFeed(scope?: 'recent'): Promise<JobFeedItem[]> {
  const token = getToken();
  const qs = scope === 'recent' ? '?scope=recent' : '';
  const res = await fetch(`${API_URL}/searches${qs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao carregar o histórico de buscas. Tente novamente.');
  }
  const data = (await res.json()) as { jobs: JobFeedItem[] };
  return data.jobs;
}
