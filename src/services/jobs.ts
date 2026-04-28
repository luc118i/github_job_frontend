import { JobRecord, Profile, UserPreferences } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export async function searchJobs(
  profile: Profile,
  preferences?: UserPreferences
): Promise<{ jobs: JobRecord[]; searchId: string }> {
  const topRepos = profile.repos
    .filter((r) => !r.fork)
    .slice(0, 5)
    .map((r) => r.name);

  const res = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: profile.user.login,
      name: profile.user.name ?? profile.user.login,
      bio: profile.user.bio,
      skills: profile.skills,
      topRepos,
      followers: profile.user.followers,
      preferences,
    }),
  });

  if (!res.ok) throw new Error('Erro ao buscar vagas');
  return res.json() as Promise<{ jobs: JobRecord[]; searchId: string }>;
}

export async function markJobSeen(jobId: string): Promise<void> {
  await fetch(`${API_URL}/jobs/${jobId}/seen`, { method: 'PATCH' });
}

export async function dismissJob(jobId: string): Promise<void> {
  await fetch(`${API_URL}/jobs/${jobId}/dismiss`, { method: 'PATCH' });
}
