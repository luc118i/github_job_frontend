const KEY_BLOCKED = 'jf_blocked_keywords';
const KEY_LIKED = 'jf_liked_keywords';

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
