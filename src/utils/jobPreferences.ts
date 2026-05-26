const KEY_BLOCKED          = 'jf_blocked_keywords';
const KEY_LIKED            = 'jf_liked_keywords';
const KEY_BLOCKED_SOURCES  = 'jf_blocked_sources';
const KEY_LIKED_SOURCES    = 'jf_liked_sources';

function load(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function save(key: string, items: string[]): void {
  localStorage.setItem(key, JSON.stringify([...new Set(items)]));
}

export function getBlockedKeywords(): string[] {
  return load(KEY_BLOCKED);
}

export function getLikedKeywords(): string[] {
  return load(KEY_LIKED);
}

export function blockKeyword(keyword: string): void {
  const kw = keyword.toLowerCase().trim();
  if (!kw) return;
  save(KEY_BLOCKED, [...load(KEY_BLOCKED), kw]);
  // remove from liked if present
  save(KEY_LIKED, load(KEY_LIKED).filter((k) => k !== kw));
}

export function likeKeyword(keyword: string): void {
  const kw = keyword.toLowerCase().trim();
  if (!kw) return;
  save(KEY_LIKED, [...load(KEY_LIKED), kw]);
  // remove from blocked if present
  save(KEY_BLOCKED, load(KEY_BLOCKED).filter((k) => k !== kw));
}

export function removeBlockedKeyword(keyword: string): void {
  save(KEY_BLOCKED, load(KEY_BLOCKED).filter((k) => k !== keyword.toLowerCase().trim()));
}

export function removeLikedKeyword(keyword: string): void {
  save(KEY_LIKED, load(KEY_LIKED).filter((k) => k !== keyword.toLowerCase().trim()));
}

// ── Source preferences ────────────────────────────────────────────

const SOURCE_MAP: [RegExp, string][] = [
  [/remotive\.com/i, 'Remotive'],
  [/gupy\.io/i, 'Gupy'],
  [/adzuna\.com/i, 'Adzuna'],
  [/indeed\.com/i, 'Indeed'],
  [/glassdoor\.com/i, 'Glassdoor'],
  [/linkedin\.com/i, 'LinkedIn'],
  [/catho\.com\.br/i, 'Catho'],
  [/infojobs\.com\.br/i, 'InfoJobs'],
  [/vagas\.com\.br/i, 'Vagas.com'],
  [/trampos\.co/i, 'Trampos.co'],
  [/programathor\.com\.br/i, 'Programathor'],
  [/geekhunter\.com\.br/i, 'GeekHunter'],
  [/99jobs\.com/i, '99jobs'],
  [/bne\.com\.br/i, 'BNE'],
  [/wellfound\.com/i, 'Wellfound'],
  [/remotar\.com\.br/i, 'Remotar'],
  [/lever\.co/i, 'Lever'],
  [/greenhouse\.io/i, 'Greenhouse'],
  [/workable\.com/i, 'Workable'],
  [/recruitee\.com/i, 'Recruitee'],
  [/bamboohr\.com/i, 'BambooHR'],
  [/smartrecruiters\.com/i, 'SmartRecruiters'],
  [/ashbyhq\.com/i, 'Ashby'],
  [/twitter\.com|x\.com/i, 'X/Twitter'],
  [/facebook\.com/i, 'Facebook'],
  [/instagram\.com/i, 'Instagram'],
  [/stackoverflow\.com/i, 'Stack Overflow'],
];

export function inferSource(link: string | null | undefined): string | null {
  if (!link) return null;
  try {
    const hostname = new URL(link).hostname.replace(/^www\./, '');
    for (const [pattern, name] of SOURCE_MAP) {
      if (pattern.test(hostname)) return name;
    }
    return null;
  } catch {
    return null;
  }
}

export function getBlockedSources(): string[] {
  return load(KEY_BLOCKED_SOURCES);
}

export function getLikedSources(): string[] {
  return load(KEY_LIKED_SOURCES);
}

export function blockSource(source: string): void {
  const s = source.trim();
  if (!s) return;
  save(KEY_BLOCKED_SOURCES, [...load(KEY_BLOCKED_SOURCES), s]);
  save(KEY_LIKED_SOURCES, load(KEY_LIKED_SOURCES).filter((k) => k !== s));
}

export function likeSource(source: string): void {
  const s = source.trim();
  if (!s) return;
  save(KEY_LIKED_SOURCES, [...load(KEY_LIKED_SOURCES), s]);
  save(KEY_BLOCKED_SOURCES, load(KEY_BLOCKED_SOURCES).filter((k) => k !== s));
}

export function removeBlockedSource(source: string): void {
  save(KEY_BLOCKED_SOURCES, load(KEY_BLOCKED_SOURCES).filter((k) => k !== source.trim()));
}

export function removeLikedSource(source: string): void {
  save(KEY_LIKED_SOURCES, load(KEY_LIKED_SOURCES).filter((k) => k !== source.trim()));
}

const CATEGORY_PATTERNS: [RegExp, string][] = [
  [/logíst|logist|armazém|warehouse|supply.?chain|transporta/i, 'logística'],
  [/machine.?learn|aprendiz.?maquin|ml\s+eng/i, 'machine learning'],
  [/data.?scien|cientist.+dado/i, 'data science'],
  [/data.?eng|engenhei.+dado/i, 'engenharia de dados'],
  [/front.?end|interface|ui.?dev/i, 'frontend'],
  [/back.?end/i, 'backend'],
  [/full.?stack/i, 'full stack'],
  [/devops|sre\b|site.?reliab/i, 'devops'],
  [/mobile|android|ios\b|flutter|react.?native/i, 'mobile'],
  [/segurança|security|pentest|infosec/i, 'segurança'],
  [/dados|analista.+dado|data.?analys/i, 'análise de dados'],
  [/produto|product.?manag/i, 'produto'],
  [/design|ux\b|ui\b/i, 'design'],
  [/suporte|helpdesk|support/i, 'suporte'],
  [/vendas|comercial|sales/i, 'vendas'],
  [/financ|contab|fiscal/i, 'finanças'],
  [/rh\b|recursos.?human|people/i, 'recursos humanos'],
];

export function inferCategory(jobTitle: string): string {
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(jobTitle)) return category;
  }
  // fallback: last meaningful word(s) of the title
  const words = jobTitle.split(/\s+/).filter((w) => w.length > 3);
  return (words[words.length - 1] ?? jobTitle).toLowerCase();
}
