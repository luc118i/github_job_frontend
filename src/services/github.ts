import { GitHubUser, GitHubRepo } from '../types';

export async function fetchGitHubUser(username: string): Promise<GitHubUser> {
  const res = await fetch(`https://api.github.com/users/${username}`);
  if (res.status === 404) throw new Error(`Usuário "${username}" não encontrado no GitHub. Verifique o nome digitado.`);
  if (res.status === 403) throw new Error('Limite de requisições do GitHub atingido. Tente novamente em alguns minutos.');
  if (!res.ok) throw new Error('Erro ao buscar perfil no GitHub. Tente novamente.');
  return res.json() as Promise<GitHubUser>;
}

export async function fetchGitHubRepos(username: string): Promise<GitHubRepo[]> {
  const res = await fetch(
    `https://api.github.com/users/${username}/repos?sort=updated&per_page=20`,
    { headers: { Accept: 'application/vnd.github+json' } }
  );
  if (!res.ok) {
    // Falha comum: 403 = rate limit da API pública do GitHub (~60 req/h por IP).
    // Devolvemos [] para não quebrar o fluxo, mas avisamos no console — sem isso
    // o CV sai sem projetos de forma silenciosa e impossível de diagnosticar.
    console.warn(`[github] falha ao buscar repos de "${username}" (HTTP ${res.status}) — CV pode sair sem projetos`);
    return [];
  }
  return res.json() as Promise<GitHubRepo[]>;
}

export function extractSkills(repos: GitHubRepo[]): string[] {
  const langCount: Record<string, number> = {};
  for (const repo of repos) {
    if (repo.language) {
      langCount[repo.language] = (langCount[repo.language] ?? 0) + 1;
    }
  }
  return Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);
}

export interface RepoContext {
  name: string;
  description: string | null;
  topics: string[];
}

export function extractRepoContext(repos: GitHubRepo[]): RepoContext[] {
  return repos
    .filter((r) => !r.fork)
    .slice(0, 6)
    .map((r) => ({ name: r.name, description: r.description, topics: r.topics ?? [] }));
}
