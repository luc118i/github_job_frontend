import { useState } from 'react';
import { JobRecord, LinkStatus } from '../types';
import { markJobSeen } from '../services/jobs';
import { isCvGenerated } from '../utils/dailyLimit';
import { inferCategory } from '../utils/jobPreferences';

const LINK_STATUS: Record<LinkStatus, { label: string; className: string } | null> = {
  trusted:    { label: 'verificado',     className: 'link-trusted' },
  unverified: { label: 'não verificado', className: 'link-unverified' },
  dead:       { label: 'link inativo',   className: 'link-dead' },
  none:       null,
};

interface JobCardProps {
  job: JobRecord;
  index: number;
  match?: number;
  onGenerateCv?: (job: JobRecord) => void;
  onViewCv?: (job: JobRecord) => void;
  onLike?: (job: JobRecord, category: string) => void;
  onBlock?: (job: JobRecord, category: string) => void;
}

export function JobCard({ job, index, match, onGenerateCv, onViewCv, onLike, onBlock }: JobCardProps) {
  const cvDone = isCvGenerated(job.id);
  const [expanded, setExpanded] = useState(false);
  const [seen, setSeen] = useState(job.seen);
  const [feedback, setFeedback] = useState<'liked' | 'blocked' | null>(null);

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && !seen) {
      setSeen(true);
      markJobSeen(job.id).catch(console.error);
    }
  }

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    const category = inferCategory(job.title);
    setFeedback('liked');
    onLike?.(job, category);
  }

  function handleBlock(e: React.MouseEvent) {
    e.stopPropagation();
    const category = inferCategory(job.title);
    setFeedback('blocked');
    onBlock?.(job, category);
  }

  const linkMeta = LINK_STATUS[job.link_status];

  if (feedback === 'blocked') return null;

  return (
    <div
      className={`job-card ${seen ? 'job-seen' : 'job-unseen'} ${feedback === 'liked' ? 'job-liked' : ''}`}
      style={{ animationDelay: `${index * 80}ms`, cursor: 'pointer' }}
      onClick={handleToggle}
    >
      <div className="job-header">
        <div className="job-meta">
          <div className="job-title-row">
            {!seen && <span className="unseen-dot" title="não vista" />}
            <span className="job-title">{job.title}</span>
          </div>
          <div className="job-company-row">
            <span className="job-company">{job.company}</span>
            {job.location && <span className="job-location">{job.location}</span>}
          </div>
        </div>
        <div className="job-badges">
          {match !== undefined && (
            <span className="badge match">{match}% match</span>
          )}
          {seen && <span className="badge seen">visto</span>}
          {job.remote && <span className="badge remote">Remote</span>}
          {job.level && <span className="badge level">{job.level}</span>}
          <span className="expand-icon">{expanded ? '−' : '+'}</span>
        </div>
      </div>

      <div className="job-skills">
        {job.skills.map((s) => (
          <span key={s} className="skill-tag">{s}</span>
        ))}
      </div>

      {(onLike || onBlock) && (
        <div className="job-feedback-row" onClick={(e) => e.stopPropagation()}>
          {onBlock && (
            <button
              className="feedback-btn feedback-block"
              onClick={handleBlock}
              title={`Menos vagas de ${inferCategory(job.title)}`}
            >
              ✕ menos assim
            </button>
          )}
          {onLike && (
            <button
              className={`feedback-btn feedback-like ${feedback === 'liked' ? 'active' : ''}`}
              onClick={handleLike}
              title={`Mais vagas de ${inferCategory(job.title)}`}
            >
              ♥ mais assim
            </button>
          )}
        </div>
      )}

      {expanded && (
        <div className="job-details">
          <p>{job.description}</p>
          {job.salary && <p className="salary">{job.salary}</p>}
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
                  Ver vaga
                </a>
                {linkMeta && (
                  <span className={`link-status ${linkMeta.className}`}>
                    {linkMeta.label}
                  </span>
                )}
              </div>
            )}
            {onGenerateCv && (
              cvDone ? (
                <button
                  className="cv-generate-btn cv-generated-btn"
                  onClick={(e) => { e.stopPropagation(); onViewCv?.(job); }}
                >
                  Ver CV
                </button>
              ) : (
                <button
                  className="cv-generate-btn"
                  onClick={(e) => { e.stopPropagation(); onGenerateCv(job); }}
                >
                  Gerar CV
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
