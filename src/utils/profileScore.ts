import { CareerProfile, LinkedInData, UserPreferences } from '../types';

/** Um item (sub-critério) que compõe uma dimensão do Career Score. */
export interface ScoreItem {
  /** Texto curto exibido (ex.: "Currículo importado"). */
  label: string;
  /**
   * Ganho no score TOTAL (0–100) ao concluir este item.
   * Já é o peso global — soma de todos os itens = 100.
   */
  weight: number;
  /** Se o usuário já preencheu/satisfez este item. */
  done: boolean;
  /** View de destino quando o usuário clica para completar (opcional). */
  hint?: string;
}

/** Uma das 5 dimensões do Career Score (MVC "Minha Carreira"). */
export interface ScoreDimension {
  key: 'perfil' | 'experiencia' | 'competencias' | 'objetivos' | 'curriculo';
  label: string;
  /** Peso da dimensão no score total (soma das 5 = 100). */
  weight: number;
  /** Quão completa está a dimensão, 0–100. */
  pct: number;
  /** Sub-critérios desta dimensão. */
  items: ScoreItem[];
}

export interface ProfileScore {
  /** Pontuação 0–100. */
  score: number;
  /** As 5 dimensões avaliadas. */
  dimensions: ScoreDimension[];
  /** Todos os itens avaliados (concluídos e pendentes). */
  items: ScoreItem[];
  /** Apenas os itens ainda pendentes, ordenados por maior ganho. */
  missing: ScoreItem[];
  /** Rótulo qualitativo do score. */
  level: 'baixo' | 'medio' | 'bom' | 'alto';
}

/** Critério interno de uma dimensão antes do cálculo do peso global. */
interface RawItem {
  label: string;
  /** Peso DENTRO da dimensão (soma dos itens da dimensão = 100). */
  local: number;
  done: boolean;
  hint?: string;
}

interface RawDimension {
  key: ScoreDimension['key'];
  label: string;
  weight: number;
  items: RawItem[];
}

/**
 * Calcula o Career Score em 5 dimensões (MVC "Minha Carreira"):
 * Perfil 20% · Experiência 25% · Competências 20% · Objetivos 20% · Currículo 15%.
 * Cada dimensão tem sub-critérios; o ganho de cada item já vem normalizado
 * para o score total (0–100), facilitando os "próximos passos".
 */
export function computeProfileScore(
  careerProfile: CareerProfile | null,
  linkedIn: LinkedInData | null,
  preferences?: UserPreferences | null,
): ProfileScore {
  const raw: RawDimension[] = [
    {
      key: 'perfil',
      label: 'Perfil',
      weight: 20,
      items: [
        { label: 'Perfil de carreira analisado', local: 50, done: !!careerProfile?.desiredAreas?.length, hint: 'outros' },
        { label: 'Resumo de personalidade',       local: 25, done: !!careerProfile?.personalitySummary?.trim(), hint: 'outros' },
        { label: 'Estilo de trabalho',            local: 25, done: !!careerProfile?.workStyle?.length, hint: 'outros' },
      ],
    },
    {
      key: 'experiencia',
      label: 'Experiência',
      weight: 25,
      items: [
        { label: 'Experiências importadas', local: 70, done: !!linkedIn?.positions?.length, hint: 'outros' },
        { label: 'Formação acadêmica',      local: 30, done: !!linkedIn?.education?.length, hint: 'outros' },
      ],
    },
    {
      key: 'competencias',
      label: 'Competências',
      weight: 20,
      items: [
        // Competências pesam mais que certificações: quem tem CV forte sem certificado chega a 80%.
        { label: 'Competências mapeadas', local: 80, done: !!careerProfile?.hiddenSkills?.length, hint: 'outros' },
        { label: 'Certificações',         local: 20, done: !!linkedIn?.certifications?.length, hint: 'outros' },
      ],
    },
    {
      key: 'objetivos',
      label: 'Objetivos',
      weight: 20,
      items: [
        { label: 'Objetivo de carreira', local: 60, done: !!careerProfile?.careerGoals?.trim(), hint: 'outros' },
        { label: 'Áreas desejadas',      local: 40, done: !!careerProfile?.desiredAreas?.length, hint: 'outros' },
      ],
    },
    {
      key: 'curriculo',
      label: 'Currículo',
      weight: 15,
      items: [
        { label: 'Currículo (LinkedIn) importado', local: 60, done: !!linkedIn?.positions?.length, hint: 'outros' },
        { label: 'Localização preferida',          local: 20, done: !!preferences?.location?.trim(), hint: 'career' },
        { label: 'Modalidade de trabalho',         local: 20, done: !!preferences && preferences.modality !== 'any', hint: 'career' },
      ],
    },
  ];

  // Converte cada item para o ganho global (peso da dimensão × peso local / 100).
  const dimensions: ScoreDimension[] = raw.map((d) => {
    const items: ScoreItem[] = d.items.map((it) => ({
      label: it.label,
      weight: Math.round((d.weight * it.local) / 100),
      done: it.done,
      hint: it.hint,
    }));
    const pct = Math.round(d.items.reduce((s, it) => s + (it.done ? it.local : 0), 0));
    return { key: d.key, label: d.label, weight: d.weight, pct, items };
  });

  const items = dimensions.flatMap((d) => d.items);
  // Score total a partir do pct real de cada dimensão (evita erro de arredondamento).
  const score = Math.round(
    dimensions.reduce((s, d) => s + (d.weight * d.pct) / 100, 0),
  );
  const missing = items.filter((it) => !it.done).sort((a, b) => b.weight - a.weight);

  const level: ProfileScore['level'] =
    score >= 90 ? 'alto' : score >= 75 ? 'bom' : score >= 50 ? 'medio' : 'baixo';

  return { score, dimensions, items, missing, level };
}

/** Cor semântica do score por faixa (MVC): 0–49 vermelho · 50–74 amarelo · 75–89 azul · 90–100 verde. */
export function scoreColor(score: number): string {
  if (score >= 90) return 'var(--match)';
  if (score >= 75) return 'var(--brand)';
  if (score >= 50) return 'var(--warning)';
  return 'var(--problem)';
}
