import { describe, it, expect } from 'vitest';
import { formatRelativeDate } from './relativeDate';

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

describe('formatRelativeDate', () => {
  it('estilo badge: maiusculas e compacto', () => {
    expect(formatRelativeDate(daysAgo(0), 'badge')).toBe('HOJE');
    expect(formatRelativeDate(daysAgo(1), 'badge')).toBe('1 DIA');
    expect(formatRelativeDate(daysAgo(3), 'badge')).toBe('3 DIAS');
    expect(formatRelativeDate(daysAgo(14), 'badge')).toBe('2 SEMANAS');
    expect(formatRelativeDate(daysAgo(60), 'badge')).toBe('2 MESES');
  });

  it('estilo phrase: minusculas com "ha"', () => {
    expect(formatRelativeDate(daysAgo(0), 'phrase')).toBe('hoje');
    expect(formatRelativeDate(daysAgo(1), 'phrase')).toBe('há 1 dia');
    expect(formatRelativeDate(daysAgo(3), 'phrase')).toBe('há 3 dias');
    expect(formatRelativeDate(daysAgo(14), 'phrase')).toBe('há 2 sem.');
    expect(formatRelativeDate(daysAgo(60), 'phrase')).toBe('há 2 meses');
  });
});
