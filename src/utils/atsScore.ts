import { CvBlock, CvBlockType } from '../types';

// Motor ATS determinístico (Career Studio M3). Sem IA: regex + NLP leve,
// roda no cliente e atualiza ao vivo enquanto o usuário edita os blocos.
// O score é uma MEDIÇÃO — o M4 (adaptar para vaga) usa-o como alvo.

export interface AtsSubscore {
  key: string;
  label: string;
  /** 0-100 */
  score: number;
  /** peso relativo no score final (soma = 1) */
  weight: number;
  /** dica acionável exibida quando o subscore está baixo */
  hint: string;
}

export interface AtsResult {
  /** 0-100 ponderado */
  score: number;
  subscores: AtsSubscore[];
}

interface AtsJob {
  title: string;
  skills: string[];
  description: string;
}

/** minúsculas + remove acentos, para casar "Análise" com "analise". */
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

// Stems de verbos de ação (pt-BR) — casados por prefixo no início do bullet.
const ACTION_STEMS = [
  'desenvolv', 'cri', 'implement', 'lider', 'gerenci', 'otimiz', 'automatiz',
  'projet', 'constru', 'reduz', 'aument', 'coorden', 'analis', 'planej',
  'execut', 'entreg', 'melhor', 'integr', 'migr', 'configur', 'mant', 'lanc',
  'estrutur', 'desenh', 'test', 'document', 'orient', 'trein', 'apoi', 'atend',
  'resolv', 'monitor', 'organiz', 'control', 'elabor', 'conduz', 'supervisio',
];

const SECTION_LABELS: Record<string, string> = {
  resumo: 'Resumo',
  experiencia: 'Experiência',
  skills: 'Habilidades',
  formacao: 'Formação',
};

// Emojis e símbolos decorativos que quebram parsers ATS.
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u;

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ── Subscores ──────────────────────────────────────────────────────

/** % das skills da vaga presentes no texto do currículo. */
function scoreKeywords(text: string, skills: string[]): { score: number; missing: string[] } {
  const uniq = Array.from(new Set(skills.map((s) => s.trim()).filter(Boolean)));
  if (uniq.length === 0) return { score: 100, missing: [] };
  const missing: string[] = [];
  let hit = 0;
  for (const skill of uniq) {
    if (text.includes(normalize(skill))) hit++;
    else missing.push(skill);
  }
  return { score: (hit / uniq.length) * 100, missing };
}

/** Seções essenciais presentes e visíveis com conteúdo. */
function scoreSections(blocks: CvBlock[]): { score: number; missing: string[] } {
  const essential: CvBlockType[] = ['resumo', 'experiencia', 'skills', 'formacao'];
  const present = new Set(
    blocks.filter((b) => b.visible && b.content.trim() && !b.content.includes('[PREENCHER]')).map((b) => b.type),
  );
  const missing = essential.filter((t) => !present.has(t)).map((t) => SECTION_LABELS[t]);
  return { score: ((essential.length - missing.length) / essential.length) * 100, missing };
}

/** Penaliza emojis, tabelas e ausência de bullets. */
function scoreFormatting(markdown: string, blocks: CvBlock[]): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 100;
  if (EMOJI_RE.test(markdown)) { score -= 35; issues.push('remova emojis/símbolos'); }
  if (/\|.*\|/.test(markdown)) { score -= 20; issues.push('evite tabelas (use listas)'); }
  const hasBullets = blocks.some((b) => /^\s*-\s+/m.test(b.content));
  if (!hasBullets) { score -= 15; issues.push('use bullets "- " nas listas'); }
  // Blocos longos sem quebra dificultam o parsing.
  const wall = blocks.some((b) => b.visible && b.content.length > 600 && !b.content.includes('\n'));
  if (wall) { score -= 10; issues.push('quebre parágrafos muito longos'); }
  return { score: clamp(score), issues };
}

/** Proporção de bullets de experiência/projetos que começam com verbo de ação. */
function scoreActionVerbs(blocks: CvBlock[]): { score: number; total: number } {
  const targets = blocks.filter((b) => b.visible && (b.type === 'experiencia' || b.type === 'projetos'));
  const bullets: string[] = [];
  for (const b of targets) {
    for (const line of b.content.split('\n')) {
      const m = line.match(/^\s*-\s+(.*)/);
      if (m && m[1].trim()) bullets.push(m[1].trim());
    }
  }
  if (bullets.length === 0) return { score: targets.length ? 40 : 100, total: 0 };
  let strong = 0;
  for (const bullet of bullets) {
    // primeiro token, ignorando markdown de negrito.
    const first = normalize(bullet.replace(/[*_`]/g, '').trim().split(/\s+/)[0] ?? '');
    if (ACTION_STEMS.some((stem) => first.startsWith(stem))) strong++;
  }
  return { score: (strong / bullets.length) * 100, total: bullets.length };
}

// ── Análise principal ──────────────────────────────────────────────

export function analyzeAts(blocks: CvBlock[], markdown: string, job: AtsJob): AtsResult {
  const text = normalize(markdown);

  const kw = scoreKeywords(text, job.skills);
  const sec = scoreSections(blocks);
  const fmt = scoreFormatting(markdown, blocks);
  const verbs = scoreActionVerbs(blocks);

  const subscores: AtsSubscore[] = [
    {
      key: 'keywords',
      label: 'Palavras-chave da vaga',
      score: clamp(kw.score),
      weight: 0.4,
      hint: kw.missing.length
        ? `faltam: ${kw.missing.slice(0, 6).join(', ')}`
        : 'todas as skills da vaga aparecem no CV',
    },
    {
      key: 'sections',
      label: 'Seções essenciais',
      score: clamp(sec.score),
      weight: 0.25,
      hint: sec.missing.length
        ? `adicione: ${sec.missing.join(', ')}`
        : 'estrutura completa para ATS',
    },
    {
      key: 'formatting',
      label: 'Formatação ATS-safe',
      score: clamp(fmt.score),
      weight: 0.2,
      hint: fmt.issues.length ? fmt.issues.join('; ') : 'formatação limpa, sem ruído',
    },
    {
      key: 'verbs',
      label: 'Verbos de ação',
      score: clamp(verbs.score),
      weight: 0.15,
      hint: verbs.total === 0
        ? 'descreva conquistas com verbos (desenvolvi, liderei...)'
        : verbs.score >= 70
          ? 'boa densidade de verbos de impacto'
          : 'comece mais bullets com verbos de ação',
    },
  ];

  const score = clamp(subscores.reduce((acc, s) => acc + s.score * s.weight, 0));
  return { score, subscores };
}

/** Faixa qualitativa para cor/rótulo do ring. */
export function atsTier(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excelente', color: '#4ADE80' };
  if (score >= 60) return { label: 'Bom', color: '#14B8A6' };
  if (score >= 40) return { label: 'Regular', color: '#F97316' };
  return { label: 'Fraco', color: '#EF4444' };
}
