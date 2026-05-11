import { LinkedInData, LinkAnalysisResponse, GitHubRepo } from '../types';
import { getToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function analyzeLink(params: {
  url: string;
  githubUsername?: string;
  githubBio?: string | null;
  skills?: string[];
  repos?: GitHubRepo[];
  linkedIn?: LinkedInData | null;
}): Promise<LinkAnalysisResponse> {
  const repos = params.repos?.map((r) => ({
    name: r.name,
    description: r.description,
    topics: r.topics ?? [],
  }));

  const res = await fetch(`${API_URL}/analyze-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ ...params, repos }),
  });

  const data = await res.json().catch(() => ({})) as { error?: string } & LinkAnalysisResponse;
  if (!res.ok) throw new Error(data.error ?? 'Erro ao analisar vaga');
  return data;
}
