import { CvBlock, CvBlockType } from '../types';

// Motor ATS determinístico (Career Studio M3 + Otimizador ATS).
// Sem IA: regex + heurísticas leves, roda no cliente e atualiza ao vivo
// enquanto o usuário edita os blocos. O score é uma MEDIÇÃO interna de
// completude/estrutura/compatibilidade ATS do Studio — nunca uma garantia
// de aprovação em processos seletivos.
//
// Arquitetura: cada categoria tem um peso fixo (soma = 100) e uma lista de
// critérios objetivos e independentes (sem dupla contagem). Trocar os pesos
// é só editar CATEGORY_WEIGHTS — nenhuma outra lógica precisa mudar.

export type AtsCategoryKey =
  | 'contact' | 'resumo' | 'experiencia' | 'formacao' | 'skills'
  | 'projetos' | 'keywords' | 'estrutura' | 'links';

/** Ação sugerida para o botão de uma recomendação levar o usuário direto ao ponto certo. */
export type AtsAction =
  | { type: 'edit-block'; blockType: CvBlockType }
  | { type: 'focus-contact' }
  | { type: 'adapt-job' };

export interface AtsCriterion {
  key: string;
  label: string;
  points: number;
  maxPoints: number;
  met: boolean;
}

export interface AtsCategory {
  key: AtsCategoryKey;
  label: string;
  score: number;
  max: number;
  criteria: AtsCriterion[];
}

export interface AtsRecommendation {
  key: string;
  label: string;
  /** pontos que a ação pode adicionar ao score total */
  points: number;
  action: AtsAction;
}

export interface AtsResult {
  /** 0-100 */
  score: number;
  categories: AtsCategory[];
  recommendations: AtsRecommendation[];
}

interface AtsJob {
  title: string;
  skills: string[];
  description: string;
}

export interface KeywordAnalysis {
  /** % (0-100) de termos relevantes da vaga presentes no currículo. */
  percent: number;
  found: string[];
  missing: string[];
}

/** Extrai a linha de contato (2ª linha do cabeçalho "# NOME\ncontato") de um CV salvo em Markdown. */
export function extractContactFromMarkdown(markdown: string): string {
  const lines = markdown.split('\n');
  const i = lines.findIndex((l) => l.startsWith('# '));
  if (i === -1) return '';
  for (let j = i + 1; j < lines.length; j++) {
    const l = lines[j].trim();
    if (!l) continue;
    if (l.startsWith('## ')) return '';
    return l;
  }
  return '';
}

/** minúsculas + remove acentos, para casar "Análise" com "analise". */
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function clamp(n: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(n)));
}

// Pesos por categoria — soma deve ser 100. Ajustar aqui não exige mudar
// nenhuma outra lógica (cada scoreX já normaliza para o próprio "max").
const CATEGORY_MAX: Record<AtsCategoryKey, number> = {
  contact: 10,
  resumo: 10,
  experiencia: 20,
  formacao: 15,
  skills: 15,
  projetos: 10,
  keywords: 10,
  estrutura: 5,
  links: 5,
};

const CATEGORY_LABEL: Record<AtsCategoryKey, string> = {
  contact: 'Contato',
  resumo: 'Resumo',
  experiencia: 'Experiência',
  formacao: 'Formação',
  skills: 'Habilidades',
  projetos: 'Projetos',
  keywords: 'Palavras-chave',
  estrutura: 'Estrutura ATS',
  links: 'Links',
};

const MONTH_RE = /\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|january|february|march|april|may|june|july|august|september|october|november|december)\b/i;
const DATE_RE = new RegExp(`${MONTH_RE.source}|\\b(19|20)\\d{2}\\b|presente|atual`, 'i');
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const LINK_IN_TEXT_RE = /(linkedin\.com|github\.com|https?:\/\/)/i;
const LOCATION_RE = /\b([A-Za-zÀ-úà-ÿ]{3,}\s*[-,]\s*[A-Z]{2})\b/;
// Emojis/símbolos decorativos que quebram parsers ATS.
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u;
const METRIC_RE = /\d+([.,]\d+)?\s*%|\bR\$\s*\d|\b\d{2,}\+?\b/;

function blockByType(blocks: CvBlock[], type: CvBlockType): CvBlock | undefined {
  return blocks.find((b) => b.type === type && b.visible);
}

function isFilled(content: string): boolean {
  const c = content.trim();
  return c.length > 0 && !c.includes('[PREENCHER]');
}

function crit(key: string, label: string, met: boolean, maxPoints: number): AtsCriterion {
  return { key, label, points: met ? maxPoints : 0, maxPoints, met };
}

function categoryFrom(key: AtsCategoryKey, criteria: AtsCriterion[]): AtsCategory {
  const score = criteria.reduce((acc, c) => acc + c.points, 0);
  return { key, label: CATEGORY_LABEL[key], score: clamp(score, CATEGORY_MAX[key]), max: CATEGORY_MAX[key], criteria };
}

// ── Categorias ────────────────────────────────────────────────────

/** Contato — 10 pts: e-mail +4, telefone +3, link profissional +2, localização +1. */
function scoreContact(contact: string): AtsCategory {
  const c = [
    crit('email', 'E-mail preenchido', EMAIL_RE.test(contact), 4),
    crit('phone', 'Telefone preenchido', PHONE_RE.test(contact), 3),
    crit('link', 'LinkedIn/GitHub/portfólio', LINK_IN_TEXT_RE.test(contact), 2),
    crit('location', 'Localização (cidade/UF)', LOCATION_RE.test(contact), 1),
  ];
  return categoryFrom('contact', c);
}

/** Resumo — 10 pts: seção existe +6, tamanho adequado (>=60 chars) +4. */
function scoreResumo(blocks: CvBlock[]): AtsCategory {
  const b = blockByType(blocks, 'resumo');
  const filled = !!b && isFilled(b.content);
  const long = filled && b!.content.trim().length >= 60;
  const c = [
    crit('present', 'Resumo profissional preenchido', filled, 6),
    crit('length', 'Resumo com tamanho adequado', long, 4),
  ];
  return categoryFrom('resumo', c);
}

/** Experiência — 20 pts: cargo/empresa/período/descrição/resultados, heurística sobre texto livre. */
function scoreExperiencia(blocks: CvBlock[]): AtsCategory {
  const b = blockByType(blocks, 'experiencia');
  const filled = !!b && isFilled(b.content);
  const content = b?.content ?? '';
  const hasCargo = filled && /\*\*[^*]+\*\*/.test(content);
  const hasEmpresa = filled && /\*\*[^*]+\*\*\s*[–—-]\s*[^(\n]+\(/.test(content);
  const hasPeriodo = filled && DATE_RE.test(content);
  const hasDescricao = filled && /:\s*\S{30,}/.test(content);
  const hasMetrica = filled && METRIC_RE.test(content);
  const c = [
    crit('present', 'Possui experiência cadastrada', filled, 8),
    crit('cargo', 'Cargo informado', hasCargo, 3),
    crit('empresa', 'Empresa informada', hasEmpresa, 2),
    crit('periodo', 'Período informado', hasPeriodo, 2),
    crit('descricao', 'Descrição adequada', hasDescricao, 2),
    crit('metrica', 'Resultados/métricas mencionados', hasMetrica, 3),
  ];
  return categoryFrom('experiencia', c);
}

/** Formação — 15 pts: seção existe +7, curso/instituição +5, período +3. */
function scoreFormacao(blocks: CvBlock[]): AtsCategory {
  const b = blockByType(blocks, 'formacao');
  const filled = !!b && isFilled(b.content);
  const content = b?.content ?? '';
  const hasCurso = filled && /\*\*[^*]+\*\*/.test(content);
  const hasPeriodo = filled && DATE_RE.test(content);
  const c = [
    crit('present', 'Formação acadêmica preenchida', filled, 7),
    crit('curso', 'Curso/instituição informado', hasCurso, 5),
    crit('periodo', 'Período informado', hasPeriodo, 3),
  ];
  return categoryFrom('formacao', c);
}

/** Habilidades — 15 pts: seção existe +6, quantidade suficiente (>=5 itens) +5, categorizado +4. */
function scoreSkills(blocks: CvBlock[]): AtsCategory {
  const b = blockByType(blocks, 'skills');
  const filled = !!b && isFilled(b.content);
  const content = b?.content ?? '';
  const items = content.split(/[,;\n]/).map((s) => s.replace(/\*\*/g, '').trim()).filter(Boolean);
  const enough = filled && items.length >= 5;
  // "categorizado" = tem ao menos 2 rótulos "**Label:**" (ex.: Linguagens / Competências).
  const categoryLabels = (content.match(/\*\*[^*]+:\*\*/g) ?? []).length;
  const categorized = filled && categoryLabels >= 2;
  const c = [
    crit('present', 'Habilidades técnicas preenchidas', filled, 6),
    crit('enough', 'Quantidade suficiente de itens', enough, 5),
    crit('categorized', 'Organizado por categoria', categorized, 4),
  ];
  return categoryFrom('skills', c);
}

/** Projetos — 10 pts: seção existe +5, com descrição +3, com link +2. */
function scoreProjetos(blocks: CvBlock[]): AtsCategory {
  const b = blockByType(blocks, 'projetos');
  const filled = !!b && isFilled(b.content);
  const content = b?.content ?? '';
  const hasDescricao = filled && /—\s*\S{15,}/.test(content);
  const hasLink = filled && /\[[^\]]+\]\([^)]+\)/.test(content);
  const c = [
    crit('present', 'Possui projetos relevantes', filled, 5),
    crit('descricao', 'Projetos com descrição', hasDescricao, 3),
    crit('link', 'Projetos com link', hasLink, 2),
  ];
  return categoryFrom('projetos', c);
}

/** Palavras-chave da vaga — 10 pts, proporcional à cobertura de skills. */
function scoreKeywords(text: string, job: AtsJob): AtsCategory {
  const ka = analyzeKeywords(text, job);
  const points = job.skills.length === 0 ? CATEGORY_MAX.keywords : (ka.percent / 100) * CATEGORY_MAX.keywords;
  const c = [
    { key: 'coverage', label: 'Cobertura de palavras-chave da vaga', points: clamp(points, CATEGORY_MAX.keywords), maxPoints: CATEGORY_MAX.keywords, met: ka.missing.length === 0 },
  ];
  return categoryFrom('keywords', c);
}

/** Estrutura compatível com ATS — 5 pts: sem placeholders, sem ruído visual, sem bloco vazio, bullets. */
function scoreEstrutura(blocks: CvBlock[], markdown: string): AtsCategory {
  const noPlaceholder = !markdown.includes('[PREENCHER]');
  const noNoise = !EMOJI_RE.test(markdown) && !/\|.*\|/.test(markdown);
  const visible = blocks.filter((b) => b.visible);
  const noEmptySection = visible.length > 0 && visible.every((b) => b.content.trim().length > 0);
  const hasBullets = blocks.some((b) => b.visible && (b.type === 'experiencia' || b.type === 'projetos') && /^\s*-\s+/m.test(b.content));
  const c = [
    crit('no-placeholder', 'Sem placeholders/mensagens internas do Studio', noPlaceholder, 2),
    crit('no-noise', 'Sem emojis/tabelas (ruído para parsers ATS)', noNoise, 1),
    crit('no-empty', 'Nenhuma seção visível está vazia', noEmptySection, 1),
    crit('bullets', 'Experiência/projetos usam bullets', hasBullets, 1),
  ];
  return categoryFrom('estrutura', c);
}

/** Links profissionais — 5 pts: link no contato +3, link de projeto válido +2. */
function scoreLinks(contact: string, blocks: CvBlock[]): AtsCategory {
  const b = blockByType(blocks, 'projetos');
  const projectLink = !!b && /\[[^\]]+\]\((https?:\/\/[^)]+)\)/.test(b.content);
  const c = [
    crit('contact-link', 'LinkedIn/GitHub no contato', LINK_IN_TEXT_RE.test(contact), 3),
    crit('project-link', 'Link de projeto válido (http/https)', projectLink, 2),
  ];
  return categoryFrom('links', c);
}

// ── Palavras-chave da vaga (usado pelo painel ATS e por "adaptar p/ vaga") ──

export function analyzeKeywords(cvText: string, job: AtsJob): KeywordAnalysis {
  const text = normalize(cvText);
  const uniq = Array.from(new Set(job.skills.map((s) => s.trim()).filter(Boolean)));
  if (uniq.length === 0) return { percent: 100, found: [], missing: [] };
  const found: string[] = [];
  const missing: string[] = [];
  for (const skill of uniq) {
    if (text.includes(normalize(skill))) found.push(skill);
    else missing.push(skill);
  }
  return { percent: Math.round((found.length / uniq.length) * 100), found, missing };
}

// ── Análise principal ──────────────────────────────────────────────

export function analyzeAts(blocks: CvBlock[], markdown: string, contact: string, job: AtsJob): AtsResult {
  const text = normalize(markdown);

  const categories: AtsCategory[] = [
    scoreContact(contact),
    scoreResumo(blocks),
    scoreExperiencia(blocks),
    scoreFormacao(blocks),
    scoreSkills(blocks),
    scoreProjetos(blocks),
    scoreKeywords(text, job),
    scoreEstrutura(blocks, markdown),
    scoreLinks(contact, blocks),
  ];

  const score = clamp(categories.reduce((acc, c) => acc + c.score, 0), 100);
  const recommendations = buildRecommendations(categories);

  return { score, categories, recommendations };
}

const BLOCK_TYPE_BY_CATEGORY: Partial<Record<AtsCategoryKey, CvBlockType>> = {
  resumo: 'resumo',
  experiencia: 'experiencia',
  formacao: 'formacao',
  skills: 'skills',
  projetos: 'projetos',
};

// Rótulo humano da recomendação por critério não atendido — reaproveita o
// label do critério, mas em tom de "o que fazer" (verbo no imperativo).
const RECO_LABEL: Record<string, string> = {
  'contact.email': 'Adicione um e-mail de contato',
  'contact.phone': 'Adicione um telefone de contato',
  'contact.link': 'Adicione seu LinkedIn, GitHub ou portfólio',
  'contact.location': 'Adicione sua cidade/UF',
  'resumo.present': 'Escreva um resumo profissional',
  'resumo.length': 'Amplie o resumo profissional (mín. 60 caracteres)',
  'experiencia.present': 'Adicione sua experiência profissional',
  'experiencia.cargo': 'Informe o cargo em cada experiência',
  'experiencia.empresa': 'Informe a empresa em cada experiência',
  'experiencia.periodo': 'Informe o período de cada experiência',
  'experiencia.descricao': 'Detalhe melhor a descrição das experiências',
  'experiencia.metrica': 'Inclua resultados mensuráveis nas experiências',
  'formacao.present': 'Adicione sua formação acadêmica',
  'formacao.curso': 'Informe o curso/instituição na formação',
  'formacao.periodo': 'Informe o período da formação',
  'skills.present': 'Adicione suas habilidades técnicas',
  'skills.enough': 'Liste mais habilidades técnicas (mín. 5)',
  'skills.categorized': 'Organize as habilidades por categoria (ex.: Linguagens, Ferramentas)',
  'projetos.present': 'Adicione projetos relevantes',
  'projetos.descricao': 'Descreva melhor os projetos',
  'projetos.link': 'Adicione o link dos projetos',
  'keywords.coverage': 'Adapte o currículo para incluir palavras-chave da vaga',
  'estrutura.no-placeholder': 'Remova textos de preenchimento pendentes',
  'estrutura.no-noise': 'Remova emojis/tabelas do currículo',
  'estrutura.no-empty': 'Preencha ou oculte as seções vazias',
  'estrutura.bullets': 'Use bullets ("- ") nas experiências/projetos',
  'links.contact-link': 'Adicione LinkedIn/GitHub no contato',
  'links.project-link': 'Adicione um link válido (http/https) aos projetos',
};

function actionFor(categoryKey: AtsCategoryKey, criterionKey: string): AtsAction {
  if (categoryKey === 'contact' || categoryKey === 'links') {
    if (criterionKey === 'project-link') return { type: 'edit-block', blockType: 'projetos' };
    return { type: 'focus-contact' };
  }
  if (categoryKey === 'keywords') return { type: 'adapt-job' };
  const blockType = BLOCK_TYPE_BY_CATEGORY[categoryKey];
  return blockType ? { type: 'edit-block', blockType } : { type: 'focus-contact' };
}

function buildRecommendations(categories: AtsCategory[]): AtsRecommendation[] {
  const out: AtsRecommendation[] = [];
  for (const cat of categories) {
    for (const cr of cat.criteria) {
      if (cr.met) continue;
      const id = `${cat.key}.${cr.key}`;
      out.push({
        key: id,
        label: RECO_LABEL[id] ?? cr.label,
        points: cr.maxPoints,
        action: actionFor(cat.key, cr.key),
      });
    }
  }
  return out.sort((a, b) => b.points - a.points);
}

/** Faixa qualitativa para cor/rótulo do ring. */
export function atsTier(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excelente', color: '#4ADE80' };
  if (score >= 60) return { label: 'Bom', color: '#14B8A6' };
  if (score >= 40) return { label: 'Regular', color: '#F97316' };
  return { label: 'Fraco', color: '#EF4444' };
}
