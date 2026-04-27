import { LinkedInData } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function importLinkedIn(file: File): Promise<LinkedInData> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_URL}/linkedin/import`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'Erro ao processar arquivo');
  }

  return res.json() as Promise<LinkedInData>;
}
