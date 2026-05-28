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
