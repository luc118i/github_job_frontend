import {
  InterviewGenRequest,
  InterviewPrepDraft,
  InterviewPrep,
  InterviewPrepInput,
  InterviewChatRequest,
} from '../types';
import { getToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Interview Studio (Career Studio M7) ───────────────────────────

/** Gera a preparação com IA (perguntas + STAR + perguntas p/ recrutador). Não persiste. */
export async function generatePrep(req: InterviewGenRequest): Promise<InterviewPrepDraft> {
  const res = await fetch(`${API_URL}/interview/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao gerar a preparação.');
  }
  return res.json() as Promise<InterviewPrepDraft>;
}

/** Um turno da simulação interativa (chat). Retorna a fala do entrevistador. */
export async function simulateInterview(req: InterviewChatRequest): Promise<string> {
  const res = await fetch(`${API_URL}/interview/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro na simulação.');
  }
  const data = await res.json() as { content: string };
  return data.content;
}

/** Busca a preparação salva da vaga (null se não houver). */
export async function fetchPrep(jobId: string): Promise<InterviewPrep | null> {
  const res = await fetch(`${API_URL}/interview?jobId=${encodeURIComponent(jobId)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao carregar a preparação.');
  }
  return res.json() as Promise<InterviewPrep | null>;
}

/** Salva/atualiza a preparação da vaga (upsert). */
export async function savePrep(input: InterviewPrepInput): Promise<InterviewPrep> {
  const res = await fetch(`${API_URL}/interview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao salvar a preparação.');
  }
  return res.json() as Promise<InterviewPrep>;
}
