import { CvRequest, CvResponse, CvRecord } from '../types';
import { getToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class CvApiError extends Error {
  retryAfter: number | null;
  constructor(message: string, retryAfter: number | null = null) {
    super(message);
    this.retryAfter = retryAfter;
  }
}

export async function generateCv(request: CvRequest): Promise<CvResponse> {
  const res = await fetch(`${API_URL}/cv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string; retryAfter?: number };
    throw new CvApiError(data.error ?? 'Erro ao gerar currículo', data.retryAfter ?? null);
  }

  return res.json() as Promise<CvResponse>;
}

export async function fetchCvByJobId(jobId: string): Promise<CvRecord> {
  const res = await fetch(`${API_URL}/cv/job/${jobId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('CV não encontrado');
  return res.json() as Promise<CvRecord>;
}

export async function updateCv(cvId: string, content: string): Promise<void> {
  const res = await fetch(`${API_URL}/cv/${cvId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Erro ao salvar CV');
}
