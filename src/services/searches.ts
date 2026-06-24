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

/**
 * Última busca por texto do usuário. Alimenta o "Descobrir Vagas": em vez de
 * exigir CV, reaproveita o termo já buscado antes. Retorna { query: null } se
 * o usuário não estiver logado ou nunca tiver feito uma busca por texto.
 */
export async function fetchLastQuery(): Promise<{ query: string | null; skills: string[] }> {
  const token = getToken();
  if (!token) return { query: null, skills: [] };
  try {
    const res = await fetch(`${API_URL}/searches/last-query`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { query: null, skills: [] };
    const data = (await res.json()) as { query: string | null; skills?: string[] };
    return { query: data.query ?? null, skills: data.skills ?? [] };
  } catch {
    return { query: null, skills: [] };
  }
}
