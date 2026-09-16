const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function markJobSeen(jobId: string): Promise<void> {
  await fetch(`${API_URL}/jobs/${jobId}/seen`, { method: 'PATCH' });
}

export async function dismissJob(jobId: string): Promise<void> {
  await fetch(`${API_URL}/jobs/${jobId}/dismiss`, { method: 'PATCH' });
}
