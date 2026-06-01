import { Project, ProjectCategory, ProjectInput, GitHubRepo } from '../types';

// Match determinístico projeto↔vaga (Career Studio M5). Sem IA/embeddings:
// sobreposição de termos entre a stack/descrição do projeto e as
// skills/título/descrição da vaga. Roda no cliente, custo zero, e usa a
// mesma normalização do motor ATS (M3) para consistência.

interface MatchJob {
  title: string;
  skills: string[];
  description: string;
}

export interface ProjectMatch {
  project: Project;
  /** 0-100 — relevância do projeto para a vaga. */
  score: number;
  /** skills da vaga que o projeto cobre (para exibir as "tags fortes"). */
  matched: string[];
}

/** minúsculas + remove acentos, para casar "Análise" com "analise". */
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

// Stopwords pt/en que poluiriam o overlap genérico (título/descrição).
const STOP = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'um', 'uma',
  'para', 'por', 'com', 'sem', 'em', 'no', 'na', 'nos', 'nas', 'ao', 'aos',
  'que', 'the', 'and', 'for', 'with', 'of', 'to', 'in', 'on', 'at', 'an',
]);

/** quebra um texto em tokens normalizados relevantes (>=3 chars, sem stopword). */
function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of normalize(text).split(/[^a-z0-9+#.]+/)) {
    const t = raw.trim();
    if (t.length >= 3 && !STOP.has(t)) out.add(t);
  }
  return out;
}

/** texto pesquisável do projeto (título + stack + descrição + destaques). */
function projectText(p: Project): string {
  return [p.title, p.tech.join(' '), p.description, p.highlights.join(' ')].join(' ');
}

/**
 * Ranqueia os projetos pela relevância à vaga.
 * Score = 70% cobertura de skills + 30% overlap de termos do título/descrição.
 * As skills pesam mais por serem o sinal mais forte (igual ao ATS).
 */
export function rankProjects(projects: Project[], job: MatchJob): ProjectMatch[] {
  const skills = Array.from(new Set(job.skills.map((s) => s.trim()).filter(Boolean)));
  // termos da vaga além das skills (título + descrição) para captar contexto.
  const jobTerms = tokenize(`${job.title} ${job.description}`);

  return projects
    .map((project) => {
      const haystack = normalize(projectText(project));
      const tokens = tokenize(projectText(project));

      // 1) cobertura de skills (substring, como o ATS faz com o markdown).
      const matched: string[] = [];
      for (const skill of skills) {
        if (haystack.includes(normalize(skill))) matched.push(skill);
      }
      const skillScore = skills.length ? (matched.length / skills.length) * 100 : 0;

      // 2) overlap de termos de contexto (interseção / termos da vaga).
      let common = 0;
      for (const t of jobTerms) if (tokens.has(t)) common++;
      const termScore = jobTerms.size ? (common / jobTerms.size) * 100 : 0;

      const score = Math.round(skillScore * 0.7 + termScore * 0.3);
      return { project, score, matched };
    })
    .sort((a, b) => b.score - a.score);
}

// ── Importação do GitHub ──────────────────────────────────────────
// Metadados por categoria: rótulo (chips de filtro) e cor (borda dos
// chips de stack / acento do card). Mesmos tokens de cor do MVC.
export const CATEGORY: Record<ProjectCategory, { label: string; color: string }> = {
  frontend: { label: 'Frontend', color: '#8B5CF6' },
  backend: { label: 'Backend', color: '#14B8A6' },
  fullstack: { label: 'Full Stack', color: '#EC4899' },
  data: { label: 'Data', color: '#F97316' },
  mobile: { label: 'Mobile', color: '#A78BFA' },
  outro: { label: 'Outro', color: '#64748B' },
};

// Pistas (substrings normalizadas) por categoria. A inferência olha
// linguagem + topics + nome + descrição do repo e decide de forma
// determinística — sem IA. Ordem de desempate definida em inferCategory.
const FRONT_HINTS = [
  'react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'vite', 'tailwind',
  'css', 'sass', 'html', 'frontend', 'front-end', 'ui', 'webpack',
];
const BACK_HINTS = [
  'node', 'express', 'nest', 'django', 'flask', 'fastapi', 'spring', 'rails',
  'laravel', 'php', 'backend', 'back-end', 'api', 'graphql', 'postgres',
  'mysql', 'mongodb', 'redis', 'dotnet', '.net', 'golang', 'rust',
];
const DATA_HINTS = [
  'pandas', 'numpy', 'jupyter', 'notebook', 'tensorflow', 'pytorch', 'keras',
  'sklearn', 'scikit', 'data', 'machine-learning', 'ml', 'analytics', 'etl',
  'spark', 'airflow', 'matplotlib',
];
const MOBILE_HINTS = [
  'react-native', 'reactnative', 'flutter', 'dart', 'swift', 'kotlin',
  'android', 'ios', 'expo', 'ionic', 'mobile', 'swiftui',
];

/** true se algum termo das pistas aparece no texto normalizado do repo. */
function hits(haystack: string, hints: string[]): boolean {
  return hints.some((h) => haystack.includes(h));
}

/**
 * Infere a categoria do projeto a partir do repo (linguagem + topics +
 * nome + descrição). Determinístico: se casar front E back → fullstack;
 * senão a primeira categoria mais específica (mobile/data antes de front/back).
 */
export function inferCategory(repo: GitHubRepo): ProjectCategory {
  const text = normalize(
    [repo.language ?? '', repo.topics.join(' '), repo.name, repo.description ?? ''].join(' '),
  );

  // Mobile e Data são mais específicos — checados primeiro.
  if (hits(text, MOBILE_HINTS)) return 'mobile';
  if (hits(text, DATA_HINTS)) return 'data';

  const isFront = hits(text, FRONT_HINTS);
  const isBack = hits(text, BACK_HINTS);
  if (isFront && isBack) return 'fullstack';
  if (isFront) return 'frontend';
  if (isBack) return 'backend';
  return 'outro';
}

/**
 * Converte repos do GitHub em payloads de projeto para importar.
 * Ignora forks (ruído). Stack = linguagem + topics; categoria inferida;
 * `repo` recebe o nome (chave de dedupe no backend).
 */
export function reposToProjectInputs(repos: GitHubRepo[]): ProjectInput[] {
  return repos
    .filter((r) => !r.fork)
    .map((r) => {
      const tech = Array.from(
        new Set([r.language, ...r.topics].filter((t): t is string => Boolean(t))),
      );
      return {
        title: r.name,
        description: r.description ?? '',
        tech,
        highlights: [],
        category: inferCategory(r),
        link: r.html_url,
        repo: r.name,
      };
    });
}

/** Faixa qualitativa para cor/rótulo da relevância. */
export function matchTier(score: number): { label: string; color: string } {
  if (score >= 60) return { label: 'Alta', color: '#4ADE80' };
  if (score >= 30) return { label: 'Média', color: '#14B8A6' };
  if (score > 0) return { label: 'Baixa', color: '#F97316' };
  return { label: 'Sem relação', color: '#64748B' };
}

/**
 * Converte projetos selecionados em Markdown para o bloco "projetos" do CV.
 * Cada projeto vira "**Título** — descrição" + bullets de destaques.
 */
export function projectsToMarkdown(projects: Project[]): string {
  return projects
    .map((p) => {
      const head = p.link ? `**${p.title}** (${p.link})` : `**${p.title}**`;
      const lines = [p.description ? `${head} — ${p.description}` : head];
      for (const h of p.highlights) if (h.trim()) lines.push(`- ${h.trim()}`);
      return lines.join('\n');
    })
    .join('\n\n');
}
