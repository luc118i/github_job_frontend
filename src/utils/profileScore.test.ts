import { describe, it, expect } from 'vitest';
import { computeProfileScore, scoreColor } from './profileScore';
import { CareerProfile, LinkedInData, UserPreferences } from '../types';

const FULL_CAREER_PROFILE: CareerProfile = {
  techLiteracy: 'advanced',
  leadershipLevel: 'high',
  workStyle: ['analytical'],
  desiredAreas: ['Frontend'],
  blockedAreas: [],
  hiddenSkills: ['Liderança de squads'],
  careerGoals: 'Crescer como tech lead',
  transitionReady: false,
  transitionTarget: null,
  personalitySummary: 'Comunicativo e orientado a dados',
  potentialSummary: 'Alto potencial de crescimento',
  completedAt: '2026-01-01T00:00:00.000Z',
};

const FULL_LINKEDIN: LinkedInData = {
  name: 'Fulano',
  email: 'fulano@example.com',
  phone: null,
  positions: [{ title: 'Dev', company: 'Acme', location: null, startedOn: '2020', finishedOn: null, description: '' }],
  education: [{ school: 'UFRJ', degree: 'Bacharelado', fieldOfStudy: 'CC', startDate: '2015', endDate: '2019', notes: null }],
  certifications: [{ name: 'AWS', authority: 'Amazon', licenseNumber: null, startedOn: '2022', finishedOn: null }],
};

const FULL_PREFERENCES: UserPreferences = {
  modality: 'remote',
  location: 'São Paulo, SP',
  salaryMin: '',
  salaryMax: '',
  level: 'any',
  maxAgeDays: 90,
  radiusKm: 0,
  ptBrOnly: true,
};

describe('computeProfileScore', () => {
  it('retorna score 0 e nivel baixo quando nao ha nenhum dado', () => {
    const result = computeProfileScore(null, null, null);
    expect(result.score).toBe(0);
    expect(result.level).toBe('baixo');
    // todos os itens devem estar pendentes
    expect(result.missing).toHaveLength(result.items.length);
  });

  it('retorna score 100 e nivel alto quando todos os dados estao completos', () => {
    const result = computeProfileScore(FULL_CAREER_PROFILE, FULL_LINKEDIN, FULL_PREFERENCES);
    expect(result.score).toBe(100);
    expect(result.level).toBe('alto');
    expect(result.missing).toHaveLength(0);
  });

  it('preenche so o LinkedIn e reflete um score parcial coerente', () => {
    const result = computeProfileScore(null, FULL_LINKEDIN, null);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);

    // Dimensao "experiencia" deve estar 100% completa (positions + education)
    const experiencia = result.dimensions.find((d) => d.key === 'experiencia');
    expect(experiencia?.pct).toBe(100);

    // Dimensao "objetivos" depende so do careerProfile -> deve estar zerada
    const objetivos = result.dimensions.find((d) => d.key === 'objetivos');
    expect(objetivos?.pct).toBe(0);
  });

  it('ordena os itens faltantes do maior para o menor peso', () => {
    const result = computeProfileScore(null, null, null);
    for (let i = 1; i < result.missing.length; i++) {
      expect(result.missing[i - 1].weight).toBeGreaterThanOrEqual(result.missing[i].weight);
    }
  });

  it('soma dos pesos globais dos itens fica bem proxima de 100 (tolera 1pp de arredondamento)', () => {
    // Cada item arredonda seu peso independentemente (Math.round por item), o
    // que pode desviar a soma em +-1 ponto. O score final NAO usa essa soma —
    // ele recalcula a partir do pct de cada dimensao — então esse desvio afeta
    // apenas os rotulos individuais ("+18%" etc.), nunca o score exibido.
    const result = computeProfileScore(null, null, null);
    const total = result.items.reduce((s, it) => s + it.weight, 0);
    expect(total).toBeGreaterThanOrEqual(99);
    expect(total).toBeLessThanOrEqual(101);
  });
});

describe('scoreColor', () => {
  it('mapeia as faixas de score para as variaveis de cor certas', () => {
    expect(scoreColor(100)).toBe('var(--match)');
    expect(scoreColor(90)).toBe('var(--match)');
    expect(scoreColor(89)).toBe('var(--brand)');
    expect(scoreColor(75)).toBe('var(--brand)');
    expect(scoreColor(74)).toBe('var(--warning)');
    expect(scoreColor(50)).toBe('var(--warning)');
    expect(scoreColor(49)).toBe('var(--problem)');
    expect(scoreColor(0)).toBe('var(--problem)');
  });
});
