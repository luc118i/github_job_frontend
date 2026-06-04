import { Project, ProjectInput, ProjectAiMatch } from '../types';
import { getToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Biblioteca de Projetos (Career Studio M5) ─────────────────────

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/projects`, { headers: authHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao carregar a biblioteca de projetos.');
  }
  return res.json() as Promise<Project[]>;
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const res = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao criar o projeto.');
  }
  return res.json() as Promise<Project>;
}

export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
  const res = await fetch(`${API_URL}/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao salvar o projeto.');
  }
  return res.json() as Promise<Project>;
}

// Importa vários projetos de uma vez (do GitHub). O backend deduplica
// pelo nome do repo e retorna só os que foram realmente criados.
export async function importProjects(projects: ProjectInput[]): Promise<Project[]> {
  const res = await fetch(`${API_URL}/projects/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ projects }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao importar os projetos.');
  }
  return res.json() as Promise<Project[]>;
}

// Match semântico por IA: o backend lê o README de cada projeto e ranqueia
// pela relevância à vaga (considera transferência de competências).
export async function matchProjectsAi(
  job: { title: string; skills: string[]; description: string },
): Promise<ProjectAiMatch[]> {
  const res = await fetch(`${API_URL}/projects/match-ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ job }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao calcular o match por IA.');
  }
  return res.json() as Promise<ProjectAiMatch[]>;
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/projects/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao excluir o projeto.');
  }
}
