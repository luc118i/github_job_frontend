import { ProfessionJobRecord } from '../types';
import { TagFilterBar } from './TagFilterBar';
import { JobCardList } from './JobCardList';

interface JobResultsSectionProps {
  jobs: ProfessionJobRecord[];
  tagFilter: string;
  onTagFilterChange: (tag: string) => void;
  /** Mensagem exibida quando não há vagas (nem após o filtro de tag). */
  emptyMessage?: string;
  /** Classes extras para a grade de vagas (ex.: ajuste de margem específico da tela). */
  gridClassName?: string;
  onGenerateCv: (job: ProfessionJobRecord) => void;
  onViewCv: (job: ProfessionJobRecord) => void;
  onLike: (job: ProfessionJobRecord, category: string) => void;
  onBlock: (job: ProfessionJobRecord, category: string) => void;
  onLikeSource: (job: ProfessionJobRecord, source: string) => void;
  onBlockSource: (job: ProfessionJobRecord, source: string) => void;
}

/**
 * Resultados de busca: barra de filtro por tag + grade de vagas + estado vazio.
 * Reaproveitado por BuscarView e ProfessionView (mesmo comportamento nos dois).
 * `tagFilter` é controlado pelo chamador — ele vive no hook useProfessionSearch,
 * que o reseta para "all" a cada nova busca.
 *
 * A TagFilterBar fica visível sempre que há vagas — mesmo se o filtro atual
 * zerar os resultados — assim o usuário sempre tem como voltar para "todos".
 */
export function JobResultsSection({
  jobs,
  tagFilter,
  onTagFilterChange,
  emptyMessage = 'Nenhuma vaga encontrada.',
  gridClassName,
  ...callbacks
}: JobResultsSectionProps) {
  if (jobs.length === 0) {
    return <div className="jrs-empty">{emptyMessage}</div>;
  }

  const allTags = [...new Set(jobs.flatMap((j) => j.skills))];
  const filtered = tagFilter === 'all' ? jobs : jobs.filter((j) => j.skills.includes(tagFilter));

  return (
    <>
      <TagFilterBar tags={allTags} active={tagFilter} count={filtered.length} onChange={onTagFilterChange} />
      {filtered.length > 0 ? (
        <JobCardList jobs={filtered} className={gridClassName} {...callbacks} />
      ) : (
        <div className="jrs-empty">{emptyMessage}</div>
      )}
    </>
  );
}
