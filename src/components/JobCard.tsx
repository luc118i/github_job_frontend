import { useState } from 'react';
import { JobRecord, LinkStatus } from '../types';
import { markJobSeen } from '../services/jobs';
import { isCvGenerated } from '../utils/dailyLimit';
import { inferCategory, inferSource } from '../utils/jobPreferences';
import { getTechIconUrl, getSourceFaviconUrl } from '../utils/techIcons';

// ── Date helper (only used when published_at exists) ──────────

function pubAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'HOJE';
  if (days === 1) return '1 DIA';
  if (days < 7)  return `${days} DIAS`;
  const w = Math.floor(days / 7);
  if (w < 5)     return `${w} SEMANA${w > 1 ? 'S' : ''}`;
  const m = Math.floor(days / 30);
  return `${m} ${m === 1 ? 'MÊS' : 'MESES'}`;
}

// ── Tech brand colours ────────────────────────────────────────

const TECH_COLORS: Record<string, string> = {
  react:         '#61dafb',
  'next.js':     '#e2e8f0',
  nextjs:        '#e2e8f0',
  typescript:    '#3b82f6',
  javascript:    '#fbbf24',
  python:        '#60a5fa',
  vue:           '#4ade80',
  'vue.js':      '#4ade80',
  angular:       '#f87171',
  'node.js':     '#4ade80',
  node:          '#4ade80',
  rust:          '#fb923c',
  go:            '#34d399',
  golang:        '#34d399',
  java:          '#fbbf24',
  php:           '#a78bfa',
  ruby:          '#f87171',
  swift:         '#fb923c',
  kotlin:        '#c084fc',
  flutter:       '#38bdf8',
  docker:        '#38bdf8',
  kubernetes:    '#60a5fa',
  aws:           '#fb923c',
  tailwind:      '#38bdf8',
  tailwindcss:   '#38bdf8',
  css:           '#60a5fa',
  html:          '#fb923c',
  graphql:       '#e879f9',
  postgresql:    '#60a5fa',
  mysql:         '#38bdf8',
  mongodb:       '#4ade80',
  redis:         '#f87171',
  'c++':         '#60a5fa',
  'c#':          '#a78bfa',
};

function techColor(s: string): string {
  return TECH_COLORS[s.toLowerCase()] ?? '#7aa3d8';
}

// ── Link status ───────────────────────────────────────────────

const LINK_META: Record<LinkStatus, { label: string; color: string } | null> = {
  trusted:    { label: 'verificado',     color: '#4ade80' },
  unverified: { label: 'não verificado', color: '#fbbf24' },
  dead:       { label: 'link inativo',   color: '#f87171' },
  none:       null,
};

// ── SVG icons ─────────────────────────────────────────────────

const IconMonitor = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 17v4"/>
  </svg>
);

const IconGlobe = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const IconClock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const IconBars = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
  </svg>
);

const IconBookmark = ({ filled }: { filled: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>
);

const IconArrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M7 17L17 7M17 7H7M17 7v10"/>
  </svg>
);

// ── Props ─────────────────────────────────────────────────────

interface JobCardProps {
  job: JobRecord;
  index: number;
  match?: number;
  onGenerateCv?: (job: JobRecord) => void;
  onViewCv?: (job: JobRecord) => void;
  onLike?: (job: JobRecord, category: string) => void;
  onBlock?: (job: JobRecord, category: string) => void;
  onLikeSource?: (job: JobRecord, source: string) => void;
  onBlockSource?: (job: JobRecord, source: string) => void;
}

// ── Component ─────────────────────────────────────────────────

export function JobCard({
  job, index, match,
  onGenerateCv, onViewCv,
  onLike, onBlock,
  onLikeSource, onBlockSource,
}: JobCardProps) {
  const cvDone   = isCvGenerated(job.id);
  const [expanded, setExpanded]     = useState(false);
  const [seen, setSeen]             = useState(job.seen);
  const [kwFeedback, setKwFeedback] = useState<'liked' | 'blocked' | null>(null);
  const [srcFeedback, setSrcFeedback] = useState<'liked' | 'blocked' | null>(null);

  const source        = inferSource(job.link);
  const linkMeta      = LINK_META[job.link_status];
  const sourceFavicon = source ? getSourceFaviconUrl(source) : null;

  const mainSkills  = job.skills.slice(0, 3);
  const otherSkills = job.skills.slice(3, 8);
  const initial     = (job.company || '?').charAt(0).toUpperCase();

  function handleExpand(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !expanded;
    setExpanded(next);
    if (next && !seen) { setSeen(true); markJobSeen(job.id).catch(console.error); }
  }

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    setKwFeedback('liked');
    onLike?.(job, inferCategory(job.title));
  }

  function handleBlock(e: React.MouseEvent) {
    e.stopPropagation();
    setKwFeedback('blocked');
    onBlock?.(job, inferCategory(job.title));
  }

  function handleLikeSource(e: React.MouseEvent) {
    e.stopPropagation();
    if (!source) return;
    setSrcFeedback('liked');
    onLikeSource?.(job, source);
  }

  function handleBlockSource(e: React.MouseEvent) {
    e.stopPropagation();
    if (!source) return;
    setSrcFeedback('blocked');
    onBlockSource?.(job, source);
  }

  if (kwFeedback === 'blocked') return null;

  return (
    <article
      className={`jcp-card${seen ? ' jcp-seen' : ' jcp-unseen'}${kwFeedback === 'liked' ? ' jcp-liked' : ''}`}
      style={{ animationDelay: `${index * 55}ms` }}
    >
      <div className="jcp-grid-bg" aria-hidden />
      <div className="jcp-glow-orb"  aria-hidden />

      {/* ══ BODY ══════════════════════════════════════════════ */}
      <div className="jcp-body">

        {/* ── Left ── */}
        <div className="jcp-left">

          {/* Badges */}
          <div className="jcp-badges-row">
            {!seen && (() => {
              // "NOVA" só para vagas sem data OU publicadas há menos de 14 dias
              const isRecent = !job.published_at ||
                (Date.now() - new Date(job.published_at).getTime()) < 14 * 86_400_000;
              return isRecent ? <span className="jcp-badge-new">NOVA</span> : null;
            })()}
            {match !== undefined && (() => {
              const level = match >= 70 ? 'high' : match >= 40 ? 'mid' : 'low';
              const label = match >= 70 ? 'Alta compatibilidade' : match >= 40 ? 'Compatível' : 'Baixa compatibilidade';
              return (
                <span className={`jcp-badge-match jcp-badge-match--${level}`} title={label}>
                  {match}% · {label}
                </span>
              );
            })()}
            {seen && <span className="jcp-badge-seen">visto</span>}
          </div>

          {/* Title */}
          <h2 className="jcp-title">{job.title}</h2>

          {/* Tech inline row  ⚛ React • N Next.js • TS TypeScript */}
          {mainSkills.length > 0 && (
            <div className="jcp-tech-row">
              {mainSkills.map((s, i) => {
                const icon = getTechIconUrl(s);
                return (
                  <span key={s} className="jcp-tech-item">
                    {i > 0 && <span className="jcp-tech-sep" aria-hidden>•</span>}
                    {icon ? (
                      <img
                        src={icon}
                        alt=""
                        className="jcp-tech-img"
                        aria-hidden
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span
                        className="jcp-tech-abbr"
                        style={{ '--tc': techColor(s) } as React.CSSProperties}
                      >
                        {s.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span
                      className="jcp-tech-name"
                      style={{ '--tc': techColor(s) } as React.CSSProperties}
                    >
                      {s}
                    </span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Company */}
          <div className="jcp-company-row">
            <div className="jcp-company-avatar">
              {sourceFavicon ? (
                <img
                  src={sourceFavicon}
                  alt={source ?? ''}
                  className="jcp-company-favicon"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    (e.currentTarget.parentElement as HTMLElement).textContent = initial;
                  }}
                />
              ) : initial}
            </div>
            <div className="jcp-company-info">
              <span className="jcp-company-name">{job.company}</span>
              <div className="jcp-loc-row">
                {job.remote && (
                  <span className="jcp-loc-item">
                    <IconMonitor /> Remoto
                  </span>
                )}
                {job.location && job.location.toLowerCase() !== 'remoto' && (
                  <span className="jcp-loc-item">
                    <IconGlobe /> {job.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right ── */}
        <div className="jcp-right">
          {job.salary && (
            <div className="jcp-info-block">
              <span className="jcp-info-label">SALÁRIO</span>
              <span className="jcp-salary">{job.salary}</span>
            </div>
          )}
          {job.level && (
            <div className="jcp-info-block">
              <span className="jcp-info-label">SENIORIDADE</span>
              <span className="jcp-level-badge">
                <IconBars />
                {job.level}
              </span>
            </div>
          )}
          {/* Data de publicação — aviso visual se vaga for velha */}
          {job.published_at && (() => {
            const ageDays = Math.floor((Date.now() - new Date(job.published_at).getTime()) / 86_400_000);
            const isOld = ageDays > 60;
            return (
              <div className={`jcp-pub-date${isOld ? ' jcp-pub-date--old' : ''}`}>
                <IconClock />
                {isOld ? '⚠️ ' : ''}PUBLICADA HÁ {pubAgo(job.published_at)}
              </div>
            );
          })()}
        </div>
      </div>

      {/* ══ FOOTER ════════════════════════════════════════════ */}
      <div className="jcp-footer">
        <div className="jcp-skills-area">
          {mainSkills.length > 0 && (
            <div className="jcp-skills-group">
              <span className="jcp-skills-label">STACK PRINCIPAL</span>
              {mainSkills.map((s) => (
                <span
                  key={s}
                  className="jcp-skill-tag jcp-skill-main"
                  style={{ '--tc': techColor(s) } as React.CSSProperties}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          {otherSkills.length > 0 && (
            <div className="jcp-skills-group">
              <span className="jcp-skills-label">OUTROS</span>
              {otherSkills.map((s) => (
                <span key={s} className="jcp-skill-tag">{s}</span>
              ))}
            </div>
          )}
        </div>

        <div className="jcp-actions">
          <button
            className={`jcp-icon-btn${expanded ? ' active' : ''}`}
            onClick={handleExpand}
            title={expanded ? 'Fechar detalhes' : 'Ver detalhes'}
          >
            <IconBookmark filled={expanded} />
          </button>
          {/* CV gerado por IA — ação primária do app, visível sem expandir */}
          {onGenerateCv && !cvDone && (
            <button
              className="jcp-cv-action"
              onClick={(e) => { e.stopPropagation(); onGenerateCv(job); }}
            >
              Gerar CV
            </button>
          )}
          {cvDone && (
            <button
              className="jcp-cv-action jcp-cv-action--done"
              onClick={(e) => { e.stopPropagation(); onViewCv?.(job); }}
            >
              Ver CV
            </button>
          )}
          {job.link && (
            <a
              href={job.link}
              target="_blank"
              rel="noopener noreferrer"
              className="jcp-apply-btn"
              onClick={(e) => e.stopPropagation()}
            >
              Ver vaga <IconArrow />
            </a>
          )}
        </div>
      </div>

      {/* ══ EXPANDED ══════════════════════════════════════════ */}
      {expanded && (
        <div className="jcp-expanded" onClick={(e) => e.stopPropagation()}>
          {job.description && <p className="jcp-description">{job.description}</p>}
          {linkMeta && (
            <div className="jcp-expanded-row">
              <span className="jcp-link-status">
                <span className="jcp-link-dot" style={{ background: linkMeta.color }} />
                {linkMeta.label}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ══ FEEDBACK ══════════════════════════════════════════ */}
      {(onLike || onBlock || (source && (onLikeSource || onBlockSource))) && (
        <div className="jcp-feedback-area" onClick={(e) => e.stopPropagation()}>
          {(onLike || onBlock) && (
            <div className="jcp-fb-row">
              {onBlock && (
                <button className="jcp-fb-btn jcp-fb-block" onClick={handleBlock}>
                  ✕ menos assim
                </button>
              )}
              {onLike && (
                <button className={`jcp-fb-btn jcp-fb-like${kwFeedback === 'liked' ? ' active' : ''}`} onClick={handleLike}>
                  ♥ mais assim
                </button>
              )}
            </div>
          )}
          {source && (onLikeSource || onBlockSource) && (
            <div className="jcp-fb-row">
              <span className="jcp-fb-source-label">
                {sourceFavicon && (
                  <img
                    src={sourceFavicon}
                    alt=""
                    className="jcp-source-favicon"
                    aria-hidden
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                via {source}
              </span>
              {onBlockSource && srcFeedback !== 'liked' && (
                <button className={`jcp-fb-btn jcp-fb-block${srcFeedback === 'blocked' ? ' active' : ''}`} onClick={handleBlockSource}>
                  ✕ essa fonte
                </button>
              )}
              {onLikeSource && srcFeedback !== 'blocked' && (
                <button className={`jcp-fb-btn jcp-fb-like${srcFeedback === 'liked' ? ' active' : ''}`} onClick={handleLikeSource}>
                  ♥ essa fonte
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
