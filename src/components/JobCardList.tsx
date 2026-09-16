import { ProfessionJobRecord } from '../types';
import { JobCard } from './JobCard';

interface JobCardListProps {
  jobs: ProfessionJobRecord[];
  /** Classes extras além de "jobs-grid" (ex.: ajuste de margem específico da tela). */
  className?: string;
  onGenerateCv: (job: ProfessionJobRecord) => void;
  onViewCv: (job: ProfessionJobRecord) => void;
  onLike: (job: ProfessionJobRecord, category: string) => void;
  onBlock: (job: ProfessionJobRecord, category: string) => void;
  onLikeSource: (job: ProfessionJobRecord, source: string) => void;
  onBlockSource: (job: ProfessionJobRecord, source: string) => void;
}

/** Grade de JobCard com o wiring padrão de feedback (like/block por categoria e por fonte).
 *  JobCard tipa seus callbacks para JobRecord (mais genérico); embrulhamos em funções que
 *  capturam o ProfessionJobRecord do closure, em vez de repassar o argumento do JobCard. */
export function JobCardList({ jobs, className, onGenerateCv, onViewCv, onLike, onBlock, onLikeSource, onBlockSource }: JobCardListProps) {
  return (
    <div className={className ? `jobs-grid ${className}` : 'jobs-grid'}>
      {jobs.map((job, i) => (
        <JobCard
          key={job.id}
          job={job}
          index={i}
          match={job.match}
          onGenerateCv={() => onGenerateCv(job)}
          onViewCv={() => onViewCv(job)}
          onLike={(_j, category) => onLike(job, category)}
          onBlock={(_j, category) => onBlock(job, category)}
          onLikeSource={(_j, source) => onLikeSource(job, source)}
          onBlockSource={(_j, source) => onBlockSource(job, source)}
        />
      ))}
    </div>
  );
}
