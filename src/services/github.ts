import { GitHubUser, GitHubRepo } from '../types';

export async function fetchGitHubUser(username: string): Promise<GitHubUser> {
  const res = await fetch(`https://api.github.com/users/${username}`);
  if (!res.ok) throw new Error('Usuário não encontrado no GitHub');
  return res.json() as Promise<GitHubUser>;
}

export async function fetchGitHubRepos(username: string): Promise<GitHubRepo[]> {
  const res = await fetch(
    `https://api.github.com/users/${username}/repos?sort=updated&per_page=20`
  );
  if (!res.ok) return [];
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
