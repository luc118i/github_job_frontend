import { CareerChatMessage, CareerProfile, LinkedInData } from '../types';
import { getToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface CareerMessageResponse {
  message?: string;
  options?: string[];
  profile?: CareerProfile;
  done: boolean;
}

export async function sendCareerMessage(
  messages: CareerChatMessage[],
  linkedIn?: LinkedInData | null,
): Promise<CareerMessageResponse> {
  const res = await fetch(`${API_URL}/career/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, linkedIn: linkedIn ?? undefined }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao enviar mensagem');
  }
  return res.json() as Promise<CareerMessageResponse>;
}

export async function sendCareerRefinement(
  profile: CareerProfile,
  messages: CareerChatMessage[],
  linkedIn?: LinkedInData | null,
): Promise<CareerMessageResponse> {
  const res = await fetch(`${API_URL}/career/refine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, messages, linkedIn: linkedIn ?? undefined }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao refinar perfil');
  }
  return res.json() as Promise<CareerMessageResponse>;
}

export async function fetchCareerProfile(): Promise<CareerProfile | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/career/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json() as { profile: CareerProfile | null };
  return data.profile;
}

/**
 * Termos de busca em alta no mercado para o perfil. Usado para enriquecer o
 * "Sugerido para você". Retorna [] em qualquer falha — o chamador faz fallback
 * para as sugestões do perfil declarado.
 */
export async function fetchTrendingSuggestions(profile: CareerProfile): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/career/trends`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { suggestions?: string[] };
    return Array.isArray(data.suggestions) ? data.suggestions : [];
  } catch {
    return [];
  }
}

export async function persistCareerProfile(profile: CareerProfile | null): Promise<void> {
  const token = getToken();
  if (!token) return;
  await fetch(`${API_URL}/career/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ profile }),
  });
}
