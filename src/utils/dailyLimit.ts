const DAILY_LIMIT = 5;
const today = () => new Date().toISOString().slice(0, 10);

interface SearchRecord {
  date: string;
  count: number;
}

function getRecord(type: string): SearchRecord {
  try {
    const raw = localStorage.getItem(`jf_search_${type}`);
    if (!raw) return { date: '', count: 0 };
    // compatibilidade com formato antigo (só a data como string)
    if (!raw.startsWith('{')) return { date: raw, count: 1 };
    return JSON.parse(raw) as SearchRecord;
  } catch {
    return { date: '', count: 0 };
  }
}

export function canSearch(type: 'github' | 'profession'): boolean {
  const record = getRecord(type);
  if (record.date !== today()) return true;
  return record.count < DAILY_LIMIT;
}

export function remainingSearches(type: 'github' | 'profession'): number {
  const record = getRecord(type);
  if (record.date !== today()) return DAILY_LIMIT;
  return Math.max(0, DAILY_LIMIT - record.count);
}

export function markSearched(type: 'github' | 'profession'): void {
  const record = getRecord(type);
  const count = record.date === today() ? record.count + 1 : 1;
  localStorage.setItem(`jf_search_${type}`, JSON.stringify({ date: today(), count }));
}

export function isCvGenerated(jobId: string): boolean {
  const list = JSON.parse(localStorage.getItem('jf_cv_jobs') ?? '[]') as string[];
  return list.includes(jobId);
}

export function markCvGenerated(jobId: string): void {
  const list = JSON.parse(localStorage.getItem('jf_cv_jobs') ?? '[]') as string[];
  if (!list.includes(jobId)) {
    localStorage.setItem('jf_cv_jobs', JSON.stringify([...list, jobId]));
  }
}
