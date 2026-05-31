import { CvRequest, CvResponse, CvRecord, CvBlock, CvVersion, CvVersionSource } from '../types';
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
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'CV não encontrado para esta vaga');
  }
  return res.json() as Promise<CvRecord>;
}

export async function updateCv(cvId: string, content: string, blocks?: CvBlock[]): Promise<void> {
  const res = await fetch(`${API_URL}/cv/${cvId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(blocks ? { content, blocks } : { content }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao salvar o CV. Tente novamente.');
  }
}

// ── Versionamento (Career Studio M2) ──────────────────────────────

export async function fetchCvVersions(cvId: string): Promise<CvVersion[]> {
  const res = await fetch(`${API_URL}/cv/${cvId}/versions`, { headers: authHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao carregar o histórico de versões.');
  }
  return res.json() as Promise<CvVersion[]>;
}

export async function saveCvVersion(
  cvId: string,
  content: string,
  blocks: CvBlock[],
  label: string,
  source: CvVersionSource = 'manual',
): Promise<void> {
  const res = await fetch(`${API_URL}/cv/${cvId}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ content, blocks, label, source }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao salvar a versão.');
  }
}

// ── Adaptar para vaga (Career Studio M4) ──────────────────────────

export async function adaptCvToJob(
  cvId: string,
  blocks: CvBlock[],
  job: CvRequest['job'],
): Promise<CvBlock[]> {
  const res = await fetch(`${API_URL}/cv/${cvId}/adapt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ blocks, job }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao adaptar o currículo.');
  }
  const out = (await res.json()) as { blocks: CvBlock[] };
  return out.blocks;
}
