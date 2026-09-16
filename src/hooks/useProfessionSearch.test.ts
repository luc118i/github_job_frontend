import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfessionSearch } from './useProfessionSearch';
import * as professionJobsService from '../services/professionJobs';
import { LinkedInData, ProfessionJobRecord, ProfessionSearchResult } from '../types';

const LINKEDIN: LinkedInData = {
  name: 'Fulano', email: null, phone: null,
  positions: [], education: [], certifications: [],
};

function makeJob(overrides: Partial<ProfessionJobRecord> = {}): ProfessionJobRecord {
  return {
    id: '1',
    search_id: 'search-1',
    title: 'Dev Frontend',
    company: 'Acme',
    level: 'Pleno',
    remote: true,
    location: null,
    skills: ['React'],
    description: '',
    salary: null,
    link: null,
    link_status: 'none',
    seen: false,
    dismissed: false,
    created_at: '2026-01-01T00:00:00.000Z',
    match: 80,
    ...overrides,
  };
}

const RESULT: ProfessionSearchResult = {
  jobs: [makeJob()],
  bonusJobs: [],
  profileSummary: 'Desenvolvedor Frontend',
};

describe('useProfessionSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('comeca sem busca feita e sem vagas', () => {
    const { result } = renderHook(() => useProfessionSearch());
    expect(result.current.hasSearched).toBe(false);
    expect(result.current.jobs).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('search() preenche jobs/bonusJobs/profileSummary e marca hasSearched em caso de sucesso', async () => {
    vi.spyOn(professionJobsService, 'fetchProfessionJobs').mockResolvedValue(RESULT);
    const { result } = renderHook(() => useProfessionSearch());

    await act(async () => {
      await result.current.search(LINKEDIN);
    });

    expect(result.current.jobs).toEqual(RESULT.jobs);
    expect(result.current.profileSummary).toBe('Desenvolvedor Frontend');
    expect(result.current.hasSearched).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('search() guarda a mensagem de erro e marca hasSearched quando o servico falha', async () => {
    // hasSearched precisa ir true mesmo no erro — senão a tela de erro nunca
    // aparece e o usuário só vê a home reaparecer sem feedback (bug corrigido).
    vi.spyOn(professionJobsService, 'fetchProfessionJobs').mockRejectedValue(new Error('Erro ao buscar vagas'));
    const { result } = renderHook(() => useProfessionSearch());

    await act(async () => {
      await result.current.search(LINKEDIN);
    });

    expect(result.current.error).toBe('Erro ao buscar vagas');
    expect(result.current.hasSearched).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('searchByQuery() tambem marca hasSearched quando o servico falha', async () => {
    vi.spyOn(professionJobsService, 'fetchJobsByQuery').mockRejectedValue(new Error('falhou'));
    const { result } = renderHook(() => useProfessionSearch());

    await act(async () => {
      await result.current.searchByQuery('analista de dados');
    });

    expect(result.current.error).toBe('falhou');
    expect(result.current.hasSearched).toBe(true);
  });

  it('reset() volta ao estado inicial', async () => {
    vi.spyOn(professionJobsService, 'fetchProfessionJobs').mockResolvedValue(RESULT);
    const { result } = renderHook(() => useProfessionSearch());

    await act(async () => {
      await result.current.search(LINKEDIN);
    });
    expect(result.current.hasSearched).toBe(true);

    act(() => result.current.reset());

    expect(result.current.hasSearched).toBe(false);
    expect(result.current.jobs).toEqual([]);
    expect(result.current.profileSummary).toBe('');
  });

  it('removeJob() remove a vaga tanto de jobs quanto de bonusJobs', async () => {
    const resultWithBonus: ProfessionSearchResult = {
      ...RESULT,
      bonusJobs: [makeJob({ id: 'bonus-1' })],
    };
    vi.spyOn(professionJobsService, 'fetchProfessionJobs').mockResolvedValue(resultWithBonus);
    const { result } = renderHook(() => useProfessionSearch());

    await act(async () => {
      await result.current.search(LINKEDIN);
    });
    expect(result.current.jobs).toHaveLength(1);
    expect(result.current.bonusJobs).toHaveLength(1);

    act(() => {
      result.current.removeJob('1');
      result.current.removeJob('bonus-1');
    });

    expect(result.current.jobs).toHaveLength(0);
    expect(result.current.bonusJobs).toHaveLength(0);
  });

  it('nao tem limite diario real: blockedToday e sempre false e remaining sempre 999', () => {
    // Documenta o comportamento atual (stub morto herdado do fluxo antigo de
    // busca por GitHub) para não regredir silenciosamente se algum dia
    // reintroduzirem um limite de fato.
    const { result } = renderHook(() => useProfessionSearch());
    expect(result.current.blockedToday).toBe(false);
    expect(result.current.remaining).toBe(999);
  });
});
