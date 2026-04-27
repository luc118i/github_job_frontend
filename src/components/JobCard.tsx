import { useState } from 'react';
import { JobRecord, LinkStatus } from '../types';
import { markJobSeen } from '../services/jobs';

const LINK_STATUS: Record<LinkStatus, { label: string; className: string } | null> = {
  trusted:    { label: 'verificado',     className: 'link-trusted' },
  unverified: { label: 'não verificado', className: 'link-unverified' },
  dead:       { label: 'link inativo',   className: 'link-dead' },
  none:       null,
};

interface JobCardProps {
  job: JobRecord;
  index: number;
  onGenerateCv?: (job: JobRecord) => void;
}

export function JobCard({ job, index, onGenerateCv }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [seen, setSeen] = useState(job.seen);

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && !seen) {
      setSeen(true);
      markJobSeen(job.id).catch(console.error);
    }
  }

  const linkMeta = LINK_STATUS[job.link_status];

  return (
    <div
      className={`job-card ${seen ? 'job-seen' : ''}`}
      style={{ animationDelay: `${index * 80}ms`, cursor: 'pointer' }}
      onClick={handleToggle}
    >
      <div className="job-header">
        <div className="job-meta">
          <span className="job-title">{job.title}</span>
          <span className="job-company">{job.company}</span>
        </div>
        <div className="job-badges">
          {seen && <span className="badge seen">visto</span>}
          {job.remote && <span className="badge remote">Remote</span>}
          {job.level && <span className="badge level">{job.level}</span>}
          <span className="expand-icon">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      <div className="job-skills">
        {job.skills.map((s) => (
          <span key={s} className="skill-tag">{s}</span>
        ))}
      </div>

      {expanded && (
        <div className="job-details">
          <p>{job.description}</p>
          {job.salary && <p className="salary">💰 {job.salary}</p>}
          <div className="job-actions">
            {job.link && (
              <div className="link-row">
                <a
                  href={job.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="apply-btn"
                >
                  Ver vaga →
                </a>
                {linkMeta && (
                  <span className={`link-status ${linkMeta.className}`}>
                    {linkMeta.label}
                  </span>
                )}
              </div>
            )}
            {onGenerateCv && (
              <button
                className="cv-generate-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateCv(job);
                }}
              >
                Gerar CV
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
