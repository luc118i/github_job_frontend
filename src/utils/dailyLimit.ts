const today = () => new Date().toISOString().slice(0, 10);

export function canSearch(type: 'github' | 'profession'): boolean {
  return localStorage.getItem(`jf_search_${type}`) !== today();
}

export function markSearched(type: 'github' | 'profession'): void {
  localStorage.setItem(`jf_search_${type}`, today());
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
