import { PortfolioData, PortfolioSettings } from '../types';
import { getToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Portfólio Público (Career Studio M8) ──────────────────────────

/** Dados públicos do portfólio (sem auth). null = não encontrado/não publicado. */
export async function fetchPublicPortfolio(username: string): Promise<PortfolioData | null> {
  const res = await fetch(`${API_URL}/portfolio/public/${encodeURIComponent(username)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao carregar o portfólio.');
  }
  return res.json() as Promise<PortfolioData>;
}

export interface PortfolioChatTurn { role: 'recruiter' | 'ai'; content: string; }

/** Gera headline + resumo do portfólio com IA (não persiste). */
export async function generatePortfolioTexts(): Promise<{ headline: string; summary: string }> {
  const res = await fetch(`${API_URL}/portfolio/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao gerar com IA.');
  }
  return res.json() as Promise<{ headline: string; summary: string }>;
}

/** "Pergunte sobre mim": pergunta ao chat de IA do portfólio (sem auth). */
export async function askPortfolio(username: string, question: string, history: PortfolioChatTurn[]): Promise<string> {
  const res = await fetch(`${API_URL}/portfolio/public/${encodeURIComponent(username)}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao perguntar.');
  }
  const data = await res.json() as { answer: string };
  return data.answer;
}

/** Configurações do portfólio do usuário logado. */
export async function fetchPortfolioSettings(): Promise<PortfolioSettings> {
  const res = await fetch(`${API_URL}/portfolio/settings`, { headers: authHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao carregar as configurações.');
  }
  return res.json() as Promise<PortfolioSettings>;
}

/** Atualiza publicação/headline/resumo. */
export async function savePortfolioSettings(patch: Partial<PortfolioSettings>): Promise<PortfolioSettings> {
  const res = await fetch(`${API_URL}/portfolio/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao salvar as configurações.');
  }
  return res.json() as Promise<PortfolioSettings>;
}
