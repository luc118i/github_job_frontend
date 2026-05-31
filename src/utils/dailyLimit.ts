// Search limits removed — the fallback chain (Claude → Gemini → Gupy/Remotive script)
// handles all scenarios without AI quota dependency, so there is no reason to gate users.

export function canSearch(_type: 'github' | 'profession'): boolean {
  return true;
}

export function remainingSearches(_type: 'github' | 'profession'): number {
  return 999;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function markSearched(_type: 'github' | 'profession'): void {
  // no-op
}

// localStorage pode lançar em modo privado ou quando cheio — sempre usar try-catch
function safeGetList(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function safeSetList(key: string, list: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // ignora — modo privado ou storage cheio
  }
}

export function isCvGenerated(jobId: string): boolean {
  return safeGetList('jf_cv_jobs').includes(jobId);
}

export function markCvGenerated(jobId: string): void {
  const list = safeGetList('jf_cv_jobs');
  if (!list.includes(jobId)) {
    safeSetList('jf_cv_jobs', [...list, jobId]);
  }
}
