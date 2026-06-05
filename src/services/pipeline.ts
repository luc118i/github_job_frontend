import { PipelineEntry, PipelineEntryInput } from '../types';
import { getToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Job Pipeline CRM (MVC v4.0) ───────────────────────────────────

/** Todas as entradas do pipeline do usuário. */
export async function fetchPipeline(): Promise<PipelineEntry[]> {
  const res = await fetch(`${API_URL}/pipeline`, { headers: authHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao carregar o pipeline.');
  }
  return res.json() as Promise<PipelineEntry[]>;
}

/** Cria/atualiza a entrada de uma vaga (upsert por user+job). */
export async function upsertPipelineEntry(jobId: string, input: PipelineEntryInput): Promise<PipelineEntry> {
  const res = await fetch(`${API_URL}/pipeline/${encodeURIComponent(jobId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao salvar a candidatura.');
  }
  return res.json() as Promise<PipelineEntry>;
}

/** Remove a entrada (vaga descartada do pipeline). */
export async function deletePipelineEntry(jobId: string): Promise<void> {
  const res = await fetch(`${API_URL}/pipeline/${encodeURIComponent(jobId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao remover a candidatura.');
  }
}
