import { JobRecord, LevelFilter } from '../types';
import { FilterBar } from './FilterBar';
import { JobCard } from './JobCard';

interface JobListProps {
  jobs: JobRecord[];
  filter: LevelFilter;
  onFilterChange: (level: LevelFilter) => void;
  onGenerateCv?: (job: JobRecord) => void;
  onViewCv?: (job: JobRecord) => void;
}

export function JobList({ jobs, filter, onFilterChange, onGenerateCv, onViewCv }: JobListProps) {
  const filtered = filter === 'all' ? jobs : jobs.filter((j) => j.level === filter);

  return (
    <div className="jobs-section">
      <FilterBar active={filter} count={filtered.length} onChange={onFilterChange} />
      <div className="jobs-grid">
        {filtered.length === 0 ? (
          <div className="empty">Nenhuma vaga para este filtro.</div>
        ) : (
          filtered.map((job, i) => (
            <JobCard key={job.id} job={job} index={i} onGenerateCv={onGenerateCv} onViewCv={onViewCv} />
          ))
        )}
      </div>
    </div>
  );
}
