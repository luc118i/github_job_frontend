import { CvRequest, CvResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function generateCv(request: CvRequest): Promise<CvResponse> {
  const res = await fetch(`${API_URL}/cv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'Erro ao gerar currículo');
  }

  return res.json() as Promise<CvResponse>;
}
