import { useEffect, useMemo, useRef, useState } from 'react';
import { JobFeedItem, KanbanJobData, KanbanStatus, LinkedInData, Profile, PipelineInsights } from '../types';
import { fetchJobFeed } from '../services/searches';
import { fetchPipelineInsights } from '../services/pipeline';
import { dismissJob } from '../services/jobs';
import { fetchCvByJobId } from '../services/cv';
import { analyzeAts, atsTier, AtsResult } from '../utils/atsScore';
import { useKanban } from '../hooks/useKanban';
import { fetchGitHubUser, fetchGitHubRepos, extractSkills } from '../services/github';
import { getToken } from '../services/auth';

// ── Column definitions ───────────────────────────────────────

interface Column {
  id: KanbanStatus;
  label: string;
  accent: string;
}

// 7 etapas do Pipeline CRM (MVC v4.0) — cor = etapa = estado da candidatura.
const COLUMNS: Column[] = [
  { id: 'salvas',     label: 'Salvas',     accent: '#3B82F6' },
  { id: 'preparar',   label: 'Preparar',   accent: '#14B8A6' },
  { id: 'aplicadas',  label: 'Aplicadas',  accent: '#8B5CF6' },
  { id: 'em_analise', label: 'Em análise', accent: '#F59E0B' },
  { id: 'entrevista', label: 'Entrevista', accent: '#F97316' },
  { id: 'proposta',   label: 'Proposta',   accent: '#22C55E' },
  { id: 'contratado', label: 'Contratado', accent: '#4ADE80' },
];

// Record vazio das 7 etapas (helper p/ agrupamentos).
function emptyByColumn<T>(): Record<KanbanStatus, T[]> {
  return { salvas: [], preparar: [], aplicadas: [], em_analise: [], entrevista: [], proposta: [], contratado: [] };
}

// ── Filter types ─────────────────────────────────────────────

type OriginFilter = 'all' | 'github' | 'linkedin';

interface BoardFilters {
  statuses: KanbanStatus[];
  favOnly: boolean;
  unseenOnly: boolean;
  date: 'all' | 'today' | 'week' | 'month';
  origin: OriginFilter; // filtra por origem da vaga
}

const DEFAULT_FILTERS: BoardFilters = {
  statuses: [],
  favOnly: false,
  unseenOnly: false,
  date: 'all',
  origin: 'all',
};

const STATUS_FILTER_CHIPS: { id: KanbanStatus; label: string; accent: string }[] = [
  { id: 'preparar',   label: 'Preparar',   accent: '#14B8A6' },
  { id: 'aplicadas',  label: 'Aplicadas',  accent: '#8B5CF6' },
  { id: 'em_analise', label: 'Em análise', accent: '#F59E0B' },
  { id: 'entrevista', label: 'Entrevista', accent: '#F97316' },
  { id: 'proposta',   label: 'Proposta',   accent: '#22C55E' },
];

type DateRange = BoardFilters['date'];
const DATE_FILTER_CHIPS: { id: DateRange; label: string }[] = [
  { id: 'today', label: 'Hoje' },
  { id: 'week',  label: 'Esta semana' },
  { id: 'month', label: 'Este mês' },
];

function hasActiveFilters(f: BoardFilters): boolean {
  return f.statuses.length > 0 || f.favOnly || f.unseenOnly || f.date !== 'all' || f.origin !== 'all';
}

// ── Helpers ──────────────────────────────────────────────────

function relDate(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return 'hoje';
  if (d === 1) return 'há 1 dia';
  if (d < 7) return `há ${d} dias`;
  const w = Math.floor(d / 7);
  if (w < 5) return w === 1 ? 'há 1 sem.' : `há ${w} sem.`;
  return `há ${Math.floor(d / 30)} meses`;
}

// Follow-up por cor (F4 do MVC): etapas que aguardam retorno disparam alerta
// conforme dias parados — 7d amarelo, 14d vermelho. Salvas/Preparar/Contratado
// não geram alerta (não dependem de retorno externo).
type FollowUpLevel = 'warn' | 'urgent';
const WAITING_STATUSES: KanbanStatus[] = ['aplicadas', 'em_analise', 'entrevista'];

function getFollowUp(status: KanbanStatus, movedAt: string): { text: string; level: FollowUpLevel } | null {
  if (!movedAt || !WAITING_STATUSES.includes(status)) return null;
  const days = Math.floor((Date.now() - new Date(movedAt).getTime()) / 86400000);
  if (days >= 14) return { text: `sem resposta há ${days}d`, level: 'urgent' };
  if (days >= 7) return { text: `aguardando há ${days}d`, level: 'warn' };
  return null;
}

// Formata a data do próximo passo para exibição (nextStepDate).
function formatNextStep(date: string): string {
  const diff = new Date(date).getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  if (days < 0) return `atrasado ${Math.abs(days)}d`;
  if (days === 0) return 'hoje';
  if (days === 1) return 'amanhã';
  return `em ${days}d`;
}

// ── StatusSummary ────────────────────────────────────────────
// Exibe contagem por status — visão rápida do funil pessoal

interface StatusSummaryProps {
  byColumn: Record<KanbanStatus, JobFeedItem[]>;
}

function StatusSummary({ byColumn }: StatusSummaryProps) {
  return (
    <div className="kb-status-summary">
      {COLUMNS.map(col => (
        <div
          key={col.id}
          className="kb-summary-chip"
          style={{ '--col-accent': col.accent } as React.CSSProperties}
        >
          <span className="kb-summary-count">{byColumn[col.id].length}</span>
          <span className="kb-summary-label">{col.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── FunnelStats ──────────────────────────────────────────────
// Mostra taxas de conversão entre as etapas do processo seletivo
// Usa total de vagas (sem filtro) para refletir o funil real

interface FunnelStatsProps {
  jobs: JobFeedItem[];
  get: (id: string) => KanbanJobData;
}

// Acumula a contagem por etapa "ou adiante" — uma vaga em entrevista também
// já passou por aplicadas/análise no funil. Reflete o afunilamento real.
function pipelineCounts(jobs: JobFeedItem[], get: (id: string) => KanbanJobData) {
  const raw = emptyByColumn<JobFeedItem>();
  jobs.forEach(j => raw[get(j.id).status].push(j));
  const at = (s: KanbanStatus) => raw[s].length;
  // ordem do funil
  const aplicadasPlus = at('aplicadas') + at('em_analise') + at('entrevista') + at('proposta') + at('contratado');
  const analisePlus = at('em_analise') + at('entrevista') + at('proposta') + at('contratado');
  const entrevistaPlus = at('entrevista') + at('proposta') + at('contratado');
  const propostaPlus = at('proposta') + at('contratado');
  return {
    total: jobs.length,
    salvas: jobs.length,
    aplicadas: aplicadasPlus,
    analise: analisePlus,
    entrevista: entrevistaPlus,
    proposta: propostaPlus,
    contratado: at('contratado'),
  };
}

function FunnelStats({ jobs, get }: FunnelStatsProps) {
  const c = useMemo(() => pipelineCounts(jobs, get), [jobs, get]);
  if (c.total === 0) return null;

  const steps = [
    { n: c.salvas, label: 'salvas' },
    { n: c.aplicadas, label: 'aplicadas' },
    { n: c.analise, label: 'em análise' },
    { n: c.entrevista, label: 'entrevistas' },
    { n: c.proposta, label: 'propostas' },
  ];

  return (
    <div className="kb-funnel">
      <div className="kb-funnel-steps">
        {steps.map((s, i) => (
          <span key={s.label} className="kb-funnel-cell">
            <span className="kb-funnel-step"><strong>{s.n}</strong> {s.label}</span>
            {i < steps.length - 1 && <span className="kb-funnel-arrow">→</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── HeaderMetrics (F1) ───────────────────────────────────────
// 6 KPIs agregados do pipeline. Match/ATS exigem dados por vaga (slice
// futuro), então mostramos os que dá calcular do pipeline hoje.
function HeaderMetrics({ jobs, get }: { jobs: JobFeedItem[]; get: (id: string) => KanbanJobData }) {
  const m = useMemo(() => {
    const c = pipelineCounts(jobs, get);
    const followUps = jobs.filter(j => {
      const kd = get(j.id);
      return !!getFollowUp(kd.status, kd.movedAt);
    }).length;
    // Taxa de resposta = (análise + entrevista + proposta + contratado) / aplicadas-ou-adiante.
    const responded = c.analise; // já saiu de "aplicadas" parada
    const respRate = c.aplicadas > 0 ? Math.round((responded / c.aplicadas) * 100) : 0;
    return {
      aplicadas: c.aplicadas,
      entrevistas: c.entrevista,
      propostas: c.proposta,
      respRate,
      followUps,
      contratado: c.contratado,
    };
  }, [jobs, get]);

  const cards = [
    { label: 'Aplicações', value: m.aplicadas, accent: '#8B5CF6' },
    { label: 'Entrevistas', value: m.entrevistas, accent: '#F97316' },
    { label: 'Propostas', value: m.propostas, accent: '#22C55E' },
    { label: 'Taxa resposta', value: `${m.respRate}%`, accent: '#14B8A6' },
    { label: 'Follow-up', value: m.followUps, accent: '#F59E0B' },
    { label: 'Contratado', value: m.contratado, accent: '#4ADE80' },
  ];

  return (
    <div className="kb-metrics">
      {cards.map(c => (
        <div key={c.label} className="kb-metric" style={{ '--col-accent': c.accent } as React.CSSProperties}>
          <span className="kb-metric-value">{c.value}</span>
          <span className="kb-metric-label">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── PipelineAnalytics (F7) ───────────────────────────────────
// Funil de conversão, taxas por etapa, benchmark e timeline mensal.
// Tudo client-side a partir dos dados do pipeline (sem libs de gráfico).

// Médias de mercado ilustrativas (referência p/ o benchmark do MVC).
const MARKET_RESPONSE_RATE = 12; // %
const MARKET_INTERVIEWS = 3;

function PipelineAnalytics({ jobs, get }: { jobs: JobFeedItem[]; get: (id: string) => KanbanJobData }) {
  const [insights, setInsights] = useState<PipelineInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState('');

  // Follow-up pendente (client-side, sem IA): vagas paradas em etapas que aguardam retorno.
  const followUps = useMemo(() => {
    return jobs
      .map((j) => ({ job: j, fu: getFollowUp(get(j.id).status, get(j.id).movedAt) }))
      .filter((x) => x.fu)
      .sort((a, b) => new Date(get(a.job.id).movedAt).getTime() - new Date(get(b.job.id).movedAt).getTime())
      .slice(0, 6);
  }, [jobs, get]);

  async function handleGenerateInsights() {
    setInsightsLoading(true);
    setInsightsError('');
    try {
      const items = jobs.map((j) => {
        const kd = get(j.id);
        const days = Math.floor((Date.now() - new Date(kd.movedAt).getTime()) / 86400000);
        return { title: j.title, company: j.company, skills: j.skills, status: kd.status, days };
      });
      setInsights(await fetchPipelineInsights(items));
    } catch (e) {
      setInsightsError((e as Error).message);
    } finally {
      setInsightsLoading(false);
    }
  }

  const a = useMemo(() => {
    const c = pipelineCounts(jobs, get);
    const stages = [
      { label: 'Salvas', n: c.salvas, accent: '#3B82F6' },
      { label: 'Aplicadas', n: c.aplicadas, accent: '#8B5CF6' },
      { label: 'Em análise', n: c.analise, accent: '#F59E0B' },
      { label: 'Entrevista', n: c.entrevista, accent: '#F97316' },
      { label: 'Proposta', n: c.proposta, accent: '#22C55E' },
      { label: 'Contratado', n: c.contratado, accent: '#4ADE80' },
    ];
    const rate = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);
    const conversions = [
      { label: 'Salva → Aplicada', pct: rate(c.aplicadas, c.salvas) },
      { label: 'Aplicada → Análise', pct: rate(c.analise, c.aplicadas) },
      { label: 'Análise → Entrevista', pct: rate(c.entrevista, c.analise) },
      { label: 'Entrevista → Proposta', pct: rate(c.proposta, c.entrevista) },
      { label: 'Proposta → Contratado', pct: rate(c.contratado, c.proposta) },
    ];
    // Timeline: vagas adicionadas por mês (últimos 6 meses).
    const months: { key: string; label: string; n: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('pt-BR', { month: 'short' }), n: 0 });
    }
    const idx = new Map(months.map((m, i) => [m.key, i]));
    jobs.forEach((j) => {
      const d = new Date(j.created_at);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const i = idx.get(k);
      if (i !== undefined) months[i].n++;
    });
    const respRate = rate(c.analise, c.aplicadas);
    return { stages, conversions, months, respRate, interviews: c.entrevista, total: c.total };
  }, [jobs, get]);

  if (a.total === 0) return <div className="kb-col-empty" style={{ margin: '40px auto' }}>Sem dados para analisar ainda.</div>;

  const maxMonth = Math.max(1, ...a.months.map((m) => m.n));

  return (
    <div className="pa-root">
      {/* Funil de conversão */}
      <section className="pa-card">
        <h3 className="pa-title">Funil de conversão</h3>
        <div className="pa-funnel">
          {a.stages.map((s, i) => {
            const widthPct = a.stages[0].n > 0 ? Math.max(6, Math.round((s.n / a.stages[0].n) * 100)) : 6;
            const dropFromPrev = i > 0 && a.stages[i - 1].n > 0 ? Math.round((s.n / a.stages[i - 1].n) * 100) : null;
            return (
              <div key={s.label} className="pa-funnel-row">
                <span className="pa-funnel-label">{s.label}</span>
                <div className="pa-funnel-track">
                  <div className="pa-funnel-bar" style={{ width: `${widthPct}%`, background: s.accent }}>
                    <span className="pa-funnel-n">{s.n}</span>
                  </div>
                </div>
                <span className="pa-funnel-pct">{dropFromPrev !== null ? `${dropFromPrev}%` : '100%'}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* IA Insights (F5) + Follow-up pendente */}
      <div className="pa-grid">
        <section className="pa-card">
          <div className="pa-ai-head">
            <h3 className="pa-title" style={{ margin: 0 }}>IA Insights</h3>
            <button className="pa-ai-btn" onClick={handleGenerateInsights} disabled={insightsLoading}>
              {insightsLoading ? 'analisando…' : insights ? '↻ atualizar' : '✨ gerar'}
            </button>
          </div>
          {insightsError && <div className="cv-lib-error" onClick={() => setInsightsError('')}>{insightsError}</div>}
          {!insights && !insightsLoading && (
            <p className="pa-ai-hint">A IA analisa seu pipeline e aponta as maiores chances de retorno, áreas que mais retornam e a próxima ação.</p>
          )}
          {insights && (
            <div className="pa-ai-body">
              {insights.topChances.length > 0 && (
                <div className="pa-ai-block">
                  <span className="pa-ai-label">Maior chance de retorno</span>
                  {insights.topChances.map((c, i) => (
                    <div key={i} className="pa-ai-chance">
                      <span className="pa-ai-score">{c.score}%</span>
                      <span className="pa-ai-chance-label">{c.label}</span>
                      {c.reason && <span className="pa-ai-reason">{c.reason}</span>}
                    </div>
                  ))}
                </div>
              )}
              {insights.positiveAreas.length > 0 && (
                <div className="pa-ai-block">
                  <span className="pa-ai-label">Mais retorno em</span>
                  <div className="pa-ai-tags">{insights.positiveAreas.map((t) => <span key={t} className="pa-ai-tag pa-ai-tag--pos">{t}</span>)}</div>
                </div>
              )}
              {insights.negativeAreas.length > 0 && (
                <div className="pa-ai-block">
                  <span className="pa-ai-label">Menos retorno em</span>
                  <div className="pa-ai-tags">{insights.negativeAreas.map((t) => <span key={t} className="pa-ai-tag pa-ai-tag--neg">{t}</span>)}</div>
                </div>
              )}
              {insights.recommendedAction && (
                <div className="pa-ai-action">→ {insights.recommendedAction}</div>
              )}
            </div>
          )}
        </section>

        <section className="pa-card">
          <h3 className="pa-title">Follow-up pendente</h3>
          {followUps.length === 0 ? (
            <p className="pa-ai-hint">Nenhum follow-up pendente. 🎯</p>
          ) : (
            <div className="pa-fu-list">
              {followUps.map(({ job, fu }) => (
                <div key={job.id} className={`pa-fu-item pa-fu-item--${fu!.level}`}>
                  <span className="pa-fu-company">{job.company}</span>
                  <span className="pa-fu-when">{fu!.text}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="pa-grid">
        {/* Taxas de conversão */}
        <section className="pa-card">
          <h3 className="pa-title">Taxas de conversão</h3>
          <div className="pa-rates">
            {a.conversions.map((r) => (
              <div key={r.label} className="pa-rate">
                <span className="pa-rate-label">{r.label}</span>
                <span className="pa-rate-val">{r.pct}%</span>
              </div>
            ))}
          </div>
        </section>

        {/* Benchmark de mercado */}
        <section className="pa-card">
          <h3 className="pa-title">Benchmark de mercado</h3>
          <div className="pa-bench">
            <div className="pa-bench-row">
              <span className="pa-bench-k">Taxa de resposta</span>
              <span className="pa-bench-me">{a.respRate}%</span>
              <span className="pa-bench-avg">média {MARKET_RESPONSE_RATE}%</span>
            </div>
            <div className="pa-bench-row">
              <span className="pa-bench-k">Entrevistas</span>
              <span className="pa-bench-me">{a.interviews}</span>
              <span className="pa-bench-avg">média {MARKET_INTERVIEWS}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Timeline de atividade */}
      <section className="pa-card">
        <h3 className="pa-title">Atividade — vagas adicionadas/mês</h3>
        <div className="pa-timeline">
          {a.months.map((m) => (
            <div key={m.key} className="pa-tl-col">
              <span className="pa-tl-n">{m.n || ''}</span>
              <div className="pa-tl-bar" style={{ height: `${Math.round((m.n / maxMonth) * 100)}%` }} />
              <span className="pa-tl-month">{m.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── KanbanCard helpers ────────────────────────────────────────

function companyInitials(name: string): string {
  const words = name.replace(/[^\wÀ-ÿ&]/g, ' ').trim().split(/\s+/).filter(w => w.length > 1 && !/^(S\/A|LTDA|SA|ME|EPP|EIRELI)$/i.test(w));
  if (!words.length) return name.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  '#3b5fc0', '#1e7a5e', '#6b3fa0', '#b5460f',
  '#0e6b8a', '#7a3f1e', '#1e5c3f', '#6b1e4a',
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── KanbanCard ───────────────────────────────────────────────

interface KanbanCardProps {
  job: JobFeedItem;
  kd: KanbanJobData;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

function KanbanCard({ job, kd, isDragging, onDragStart, onDragEnd, onClick, onToggleFavorite }: KanbanCardProps) {
  const topSkills = job.skills.slice(0, 3);
  const followUp = getFollowUp(kd.status, kd.movedAt);
  const levelClass = job.level.toLowerCase();
  const initials = companyInitials(job.company);
  const bgColor  = avatarColor(job.company);
  const source   = job.github_username ? 'GitHub' : 'LinkedIn';

  return (
    <div
      className={`kb-card${isDragging ? ' kb-card--dragging' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      {/* Top row: level + star */}
      <div className="kb-card-header">
        <span className={`kb-level kb-level--${levelClass}`}>{job.level}</span>
        <div className="kb-card-actions">
          {kd.notes.trim() && <span className="kb-notes-dot" title="Tem notas" />}
          <button
            className={`kb-star${kd.favorite ? ' kb-star--active' : ''}`}
            onClick={onToggleFavorite}
            title={kd.favorite ? 'Remover dos favoritos' : 'Favoritar'}
          >
            {kd.favorite ? '★' : '☆'}
          </button>
        </div>
      </div>

      {/* Main content: avatar + info */}
      <div className="kb-card-body">
        <div
          className="kb-company-avatar"
          style={{ background: bgColor }}
          aria-hidden
        >
          {initials}
        </div>

        <div className="kb-card-info">
          <h4 className="kb-card-title">{job.title}</h4>
          <p className="kb-card-company">{job.company}</p>
          {job.location && <p className="kb-card-location">{job.location}</p>}

          {topSkills.length > 0 && (
            <div className="kb-card-skills">
              {topSkills.map(s => <span key={s} className="kb-skill">{s}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* Footer: source + salário + última ação */}
      <div className="kb-card-footer">
        <span className="kb-source">{source}</span>
        {job.salary && <span className="kb-salary">{job.salary}</span>}
        <span className="kb-date">{relDate(kd.movedAt || job.created_at)}</span>
      </div>

      {/* Próximo passo (CRM) */}
      {kd.nextStep && (
        <div className="kb-nextstep">
          → {kd.nextStep}{kd.nextStepDate ? ` · ${formatNextStep(kd.nextStepDate)}` : ''}
        </div>
      )}

      {/* Preparar: sinaliza ação requerida (F2) */}
      {kd.status === 'preparar' && !kd.nextStep && (
        <div className="kb-nextstep kb-nextstep--todo">ação requerida — adaptar CV / gerar carta</div>
      )}

      {/* Follow-up por cor (F4) */}
      {followUp && <div className={`kb-followup kb-followup--${followUp.level}`}>{followUp.text}</div>}
    </div>
  );
}

// ── KanbanColumn ─────────────────────────────────────────────

interface KanbanColumnProps {
  column: Column;
  jobs: JobFeedItem[];
  isOver: boolean;
  isActiveMobile: boolean;
  get: (id: string) => KanbanJobData;
  draggingId: string | null;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onCardDragStart: (e: React.DragEvent, id: string) => void;
  onCardDragEnd: () => void;
  onCardClick: (job: JobFeedItem) => void;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
}

function KanbanColumn({
  column, jobs, isOver, isActiveMobile, get, draggingId,
  onDragOver, onDragLeave, onDrop,
  onCardDragStart, onCardDragEnd, onCardClick, onToggleFavorite,
}: KanbanColumnProps) {
  return (
    <div
      className={`kb-column${isOver ? ' kb-column--over' : ''}${isActiveMobile ? ' kb-column--mobile-active' : ''}`}
      style={{ '--col-accent': column.accent } as React.CSSProperties}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="kb-col-header">
        <span className="kb-col-title">{column.label}</span>
        <span className="kb-col-count">{jobs.length}</span>
      </div>

      <div className="kb-col-cards">
        {jobs.length === 0 && (
          <div className="kb-col-empty">Arraste vagas aqui</div>
        )}
        {jobs.map(job => (
          <KanbanCard
            key={job.id}
            job={job}
            kd={get(job.id)}
            isDragging={draggingId === job.id}
            onDragStart={e => onCardDragStart(e, job.id)}
            onDragEnd={onCardDragEnd}
            onClick={() => onCardClick(job)}
            onToggleFavorite={e => onToggleFavorite(e, job.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ── KanbanFilterBar ──────────────────────────────────────────

interface KanbanFilterBarProps {
  filters: BoardFilters;
  total: number;
  filtered: number;
  onChange: (f: BoardFilters) => void;
}

function KanbanFilterBar({ filters, total, filtered, onChange }: KanbanFilterBarProps) {
  function toggleStatus(id: KanbanStatus) {
    const next = filters.statuses.includes(id)
      ? filters.statuses.filter(s => s !== id)
      : [...filters.statuses, id];
    onChange({ ...filters, statuses: next });
  }

  function toggleDate(id: DateRange) {
    onChange({ ...filters, date: filters.date === id ? 'all' : id });
  }

  function toggleOrigin(id: OriginFilter) {
    onChange({ ...filters, origin: filters.origin === id ? 'all' : id });
  }

  const active = hasActiveFilters(filters);
  const showCount = active && filtered < total;

  return (
    <div className="kb-filter-bar">
      <div className="kb-filter-chips">
        {STATUS_FILTER_CHIPS.map(chip => (
          <button
            key={chip.id}
            className={`kb-chip kb-chip--status${filters.statuses.includes(chip.id) ? ' active' : ''}`}
            style={{ '--col-accent': chip.accent } as React.CSSProperties}
            onClick={() => toggleStatus(chip.id)}
          >
            {chip.label}
          </button>
        ))}

        <span className="kb-filter-sep" />

        <button
          className={`kb-chip kb-chip--fav${filters.favOnly ? ' active' : ''}`}
          onClick={() => onChange({ ...filters, favOnly: !filters.favOnly })}
        >
          ★ Favoritos
        </button>

        <button
          className={`kb-chip kb-chip--unseen${filters.unseenOnly ? ' active' : ''}`}
          onClick={() => onChange({ ...filters, unseenOnly: !filters.unseenOnly })}
        >
          Não vistas
        </button>

        <span className="kb-filter-sep" />

        {DATE_FILTER_CHIPS.map(chip => (
          <button
            key={chip.id}
            className={`kb-chip kb-chip--date${filters.date === chip.id ? ' active' : ''}`}
            onClick={() => toggleDate(chip.id)}
          >
            {chip.label}
          </button>
        ))}

        <span className="kb-filter-sep" />

        {/* filtros de origem — útil para separar buscas do Lucas (GitHub) e do irmão (LinkedIn) */}
        <button
          className={`kb-chip kb-chip--origin${filters.origin === 'github' ? ' active' : ''}`}
          onClick={() => toggleOrigin('github')}
        >
          GitHub
        </button>
        <button
          className={`kb-chip kb-chip--origin${filters.origin === 'linkedin' ? ' active' : ''}`}
          onClick={() => toggleOrigin('linkedin')}
        >
          LinkedIn
        </button>
      </div>

      <div className="kb-filter-right">
        {showCount && (
          <span className="kb-filter-count">{filtered} de {total}</span>
        )}
        {active && (
          <button className="kb-filter-clear" onClick={() => onChange(DEFAULT_FILTERS)}>
            limpar
          </button>
        )}
      </div>
    </div>
  );
}

// ── JobDetailPanel ───────────────────────────────────────────

interface PanelProps {
  job: JobFeedItem;
  kd: KanbanJobData;
  linkedInData: LinkedInData | null;
  githubUsername: string | null;
  onClose: () => void;
  onStatusChange: (s: KanbanStatus) => void;
  onNotesChange: (n: string) => void;
  onNextStepChange: (text: string, date: string) => void;
  onGenerateCv: (job: JobFeedItem, profile: Profile) => void;
  onViewCv: (job: JobFeedItem) => void;
  onDelete: (id: string) => void;
}

function JobDetailPanel({
  job, kd, linkedInData, githubUsername,
  onClose, onStatusChange, onNotesChange, onNextStepChange,
  onGenerateCv, onViewCv, onDelete,
}: PanelProps) {
  const [cvLoading, setCvLoading] = useState(false);
  const [ats, setAts] = useState<AtsResult | null>(null);
  const [hasCv, setHasCv] = useState<boolean | null>(null); // null = ainda carregando
  const isLinkedIn = !job.github_username;
  const daysInStatus = kd.movedAt
    ? Math.floor((Date.now() - new Date(kd.movedAt).getTime()) / 86400000)
    : null;
  const currentColIdx = COLUMNS.findIndex(c => c.id === kd.status);
  const currentCol = COLUMNS[currentColIdx];
  const nextCol = currentColIdx >= 0 && currentColIdx < COLUMNS.length - 1 ? COLUMNS[currentColIdx + 1] : null;
  const panelRef = useRef<HTMLDivElement>(null);

  // Busca o CV gerado p/ essa vaga e calcula o ATS (F6: "currículo utilizado").
  useEffect(() => {
    let alive = true;
    setAts(null);
    setHasCv(null);
    fetchCvByJobId(job.id)
      .then((cv) => {
        if (!alive) return;
        const blocks = cv.content_blocks ?? [];
        setHasCv(true);
        if (blocks.length) {
          setAts(analyzeAts(blocks, cv.content ?? '', { title: job.title, skills: job.skills, description: job.description }));
        }
      })
      .catch(() => { if (alive) setHasCv(false); }); // 404 = sem CV ainda
    return () => { alive = false; };
  }, [job.id, job.title, job.skills, job.description]);

  // Fecha o painel com Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleGenerateCv() {
    if (isLinkedIn) {
      const profile: Profile = {
        user: {
          login: githubUsername ?? '',
          name: linkedInData?.name ?? 'Candidato',
          bio: null,
          avatar_url: '',
          followers: 0,
          public_repos: 0,
        },
        repos: [],
        skills: job.skills,
      };
      onGenerateCv(job, profile);
      return;
    }
    setCvLoading(true);
    try {
      const [user, repos] = await Promise.all([
        fetchGitHubUser(job.github_username!),
        fetchGitHubRepos(job.github_username!),
      ]);
      onGenerateCv(job, { user, repos, skills: extractSkills(repos) });
    } finally {
      setCvLoading(false);
    }
  }

  function handleDelete() {
    dismissJob(job.id).catch(console.error);
    onDelete(job.id);
    onClose();
  }

  const locationLabel = job.remote ? 'Remoto' : (job.location ?? 'Presencial');

  return (
    <>
      <div className="kb-backdrop" onClick={onClose} />
      <div className="kb-panel" ref={panelRef}>
        <div className="kb-panel-head">
          <div className="kb-panel-title-row">
            <h3 className="kb-panel-title">{job.title}</h3>
            <button className="kb-panel-close" onClick={onClose}>×</button>
          </div>
          <p className="kb-panel-sub">{job.company} · {job.level} · {locationLabel}</p>
        </div>

        <div className="kb-panel-body">
          <div className="kb-panel-section">
            <span className="kb-panel-label">Status</span>
            <div className="kb-panel-statuses">
              {COLUMNS.map(col => (
                <button
                  key={col.id}
                  className={`kb-status-btn${kd.status === col.id ? ' active' : ''}`}
                  style={{ '--col-accent': col.accent } as React.CSSProperties}
                  onClick={() => onStatusChange(col.id)}
                >
                  {col.label}
                </button>
              ))}
            </div>
          </div>

          {/* Info da vaga — grid 2x2 compacto (F6) */}
          <div className="kb-panel-section">
            <div className="kb-info-grid">
              <div className="kb-info-cell"><span className="kb-info-k">Empresa</span><span className="kb-info-v">{job.company}</span></div>
              <div className="kb-info-cell"><span className="kb-info-k">Local</span><span className="kb-info-v">{locationLabel}</span></div>
              <div className="kb-info-cell"><span className="kb-info-k">Salário</span><span className="kb-info-v">{job.salary ?? '—'}</span></div>
              <div className="kb-info-cell"><span className="kb-info-k">Nível</span><span className="kb-info-v">{job.level}</span></div>
            </div>
          </div>

          {/* Currículo utilizado + ATS (F6) */}
          <div className="kb-panel-section">
            <span className="kb-panel-label">Currículo utilizado</span>
            {hasCv === null ? (
              <span className="kb-cv-loading">verificando…</span>
            ) : hasCv ? (
              <div className="kb-cv-row">
                <button className="kb-cv-link" onClick={() => onViewCv(job)}>CV salvo para esta vaga</button>
                {ats && (
                  <span className="kb-ats-kpi" style={{ '--col-accent': atsTier(ats.score).color } as React.CSSProperties}>
                    ATS {ats.score}%
                  </span>
                )}
              </div>
            ) : (
              <span className="kb-cv-empty">nenhum CV gerado ainda</span>
            )}
          </div>

          {job.description && (
            <div className="kb-panel-section">
              <span className="kb-panel-label">Descrição</span>
              <p className="kb-panel-desc">{job.description}</p>
            </div>
          )}

          {job.skills.length > 0 && (
            <div className="kb-panel-section">
              <span className="kb-panel-label">Competências</span>
              <div className="kb-panel-skills">
                {job.skills.map(s => <span key={s} className="kb-skill">{s}</span>)}
              </div>
            </div>
          )}

          {/* próximo passo (CRM): a próxima ação + quando fazê-la */}
          <div className="kb-panel-section">
            <span className="kb-panel-label">Próximo passo</span>
            <input
              type="text"
              className="kb-notes-area"
              placeholder="Ex.: enviar follow-up, preparar entrevista..."
              value={kd.nextStep ?? ''}
              onChange={e => onNextStepChange(e.target.value, kd.nextStepDate ?? '')}
            />
            <input
              type="date"
              className="kb-deadline-input"
              value={kd.nextStepDate ?? ''}
              onChange={e => onNextStepChange(kd.nextStep ?? '', e.target.value)}
            />
            {kd.nextStepDate && (
              <span className="kb-deadline-hint">{formatNextStep(kd.nextStepDate)}</span>
            )}
          </div>

          {/* Histórico — timeline simples a partir do que rastreamos (F6) */}
          <div className="kb-panel-section">
            <span className="kb-panel-label">Histórico</span>
            <div className="kb-timeline">
              <div className="kb-tl-item">
                <span className="kb-tl-dot" />
                <span className="kb-tl-text">Vaga adicionada</span>
                <span className="kb-tl-when">{relDate(job.created_at)}</span>
              </div>
              {hasCv && (
                <div className="kb-tl-item">
                  <span className="kb-tl-dot" />
                  <span className="kb-tl-text">CV gerado{ats ? ` · ATS ${ats.score}%` : ''}</span>
                </div>
              )}
              {currentCol && (
                <div className="kb-tl-item">
                  <span className="kb-tl-dot kb-tl-dot--active" style={{ background: currentCol.accent }} />
                  <span className="kb-tl-text">Em &quot;{currentCol.label}&quot;</span>
                  <span className="kb-tl-when">{daysInStatus === 0 ? 'hoje' : `há ${daysInStatus}d`}</span>
                </div>
              )}
            </div>
          </div>

          <div className="kb-panel-section">
            <span className="kb-panel-label">Notas pessoais</span>
            <textarea
              className="kb-notes-area"
              placeholder="Observações, feedbacks da entrevista, contatos, perguntas..."
              value={kd.notes}
              onChange={e => onNotesChange(e.target.value)}
              rows={5}
            />
          </div>

          {/* CTA primário: avança para a próxima etapa (F6) */}
          {nextCol && (
            <button
              className="kb-move-cta"
              style={{ '--col-accent': nextCol.accent } as React.CSSProperties}
              onClick={() => onStatusChange(nextCol.id)}
            >
              Mover para {nextCol.label} →
            </button>
          )}

          <div className="kb-panel-section kb-panel-meta-row">
            {job.salary && <span>{job.salary}</span>}
            <span>Adicionada {relDate(job.created_at)}</span>
            {daysInStatus !== null && kd.status !== 'salvas' && currentCol && (
              <span>Em &quot;{currentCol.label}&quot; há {daysInStatus === 0 ? 'hoje' : `${daysInStatus}d`}</span>
            )}
            <span>{isLinkedIn ? 'via LinkedIn' : `via @${job.github_username}`}</span>
          </div>

          <div className="kb-panel-actions">
            {job.link && (
              <a
                className="kb-action-btn"
                href={job.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver vaga
              </a>
            )}
            <button
              className="kb-action-btn"
              onClick={handleGenerateCv}
              disabled={cvLoading}
            >
              {cvLoading ? 'Buscando...' : 'Gerar CV'}
            </button>
            <button
              className="kb-action-btn kb-action-btn--ghost"
              onClick={() => onViewCv(job)}
            >
              Ver CV
            </button>
            <button
              className="kb-action-btn kb-action-btn--danger"
              onClick={handleDelete}
            >
              Remover
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── KanbanBoard ──────────────────────────────────────────────

interface KanbanBoardProps {
  linkedInData: LinkedInData | null;
  githubUsername: string | null;
  onGenerateCv: (job: JobFeedItem, profile: Profile) => void;
  onViewCv: (job: JobFeedItem) => void;
  onStaleCount?: (count: number) => void; // emite quantidade de vagas paradas para o badge da aba
}

export function KanbanBoard({ linkedInData, githubUsername, onGenerateCv, onViewCv, onStaleCount }: KanbanBoardProps) {
  const [jobs, setJobs] = useState<JobFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<BoardFilters>(DEFAULT_FILTERS);
  const [selectedJob, setSelectedJob] = useState<JobFeedItem | null>(null);
  const [dragOverCol, setDragOverCol] = useState<KanbanStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeMobileCol, setActiveMobileCol] = useState<KanbanStatus>('salvas');
  const [boardView, setBoardView] = useState<'board' | 'analytics'>('board');

  const { get, setStatus, setNotes, toggleFavorite, setNextStep } = useKanban();

  useEffect(() => {
    fetchJobFeed()
      .then(all => setJobs(all.filter(j => !j.dismissed)))
      .catch(() => setFetchError('Erro ao carregar vagas.'))
      .finally(() => setLoading(false));
  }, []);

  // Calcula e emite a quantidade de vagas "aplicadas" sem movimentação há +7 dias
  // para o badge de alerta na aba "organizar" do TabNav
  useEffect(() => {
    if (!onStaleCount) return;
    const stale = jobs.filter(j => {
      const kd = get(j.id);
      if (kd.status !== 'aplicadas') return false;
      const days = Math.floor((Date.now() - new Date(kd.movedAt).getTime()) / 86400000);
      return days >= 7;
    }).length;
    onStaleCount(stale);
  }, [jobs, get, onStaleCount]);

  const visible = useMemo(() => {
    let list = jobs;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.skills.some(s => s.toLowerCase().includes(q))
      );
    }

    if (filters.statuses.length > 0) {
      list = list.filter(j => filters.statuses.includes(get(j.id).status));
    }

    if (filters.favOnly) list = list.filter(j => get(j.id).favorite);
    if (filters.unseenOnly) list = list.filter(j => !j.seen);

    if (filters.date !== 'all') {
      const ms = { today: 86400000, week: 7 * 86400000, month: 30 * 86400000 }[filters.date];
      const now = Date.now();
      list = list.filter(j => now - new Date(j.created_at).getTime() < ms);
    }

    // filtra por origem: github_username preenchido = veio de busca GitHub; null = LinkedIn
    if (filters.origin === 'github') list = list.filter(j => !!j.github_username);
    if (filters.origin === 'linkedin') list = list.filter(j => !j.github_username);

    return list;
  }, [jobs, search, filters, get]);

  const byColumn = useMemo(() => {
    const g = emptyByColumn<JobFeedItem>();
    visible.forEach(j => g[get(j.id).status].push(j));
    return g;
  }, [visible, get]);

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('jobId', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(id);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverCol(null);
  }

  function handleDragOver(e: React.DragEvent, col: KanbanStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== col) setDragOverCol(col);
  }

  function handleDragLeave(e: React.DragEvent, col: KanbanStatus) {
    if ((e.currentTarget as Element).contains(e.relatedTarget as Node)) return;
    if (dragOverCol === col) setDragOverCol(null);
  }

  function handleDrop(e: React.DragEvent, col: KanbanStatus) {
    e.preventDefault();
    const id = e.dataTransfer.getData('jobId');
    if (id) setStatus(id, col);
    setDragOverCol(null);
    setDraggingId(null);
  }

  function handleDelete(id: string) {
    setJobs(prev => prev.filter(j => j.id !== id));
  }

  if (!getToken()) {
    return (
      <div className="kb-empty-state">
        <h3>Acesso restrito</h3>
        <p>Faça login para visualizar e organizar suas candidaturas.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-bar" style={{ marginTop: 48 }}>
        <div className="loading-step"><div className="dot" /> Carregando vagas...</div>
      </div>
    );
  }

  if (fetchError) return <div className="error-msg">{fetchError}</div>;

  if (jobs.length === 0) {
    return (
      <div className="kb-empty-state">
        <h3>Nenhuma vaga salva</h3>
        <p>Busque vagas na aba "buscar" ou "vagas TI" para começar a organizar suas candidaturas.</p>
      </div>
    );
  }

  return (
    <div className="kb-root">
      <div className="kb-header">
        <div className="kb-header-left">
          <h2 className="kb-board-title">Pipeline de Carreira</h2>
          <span className="kb-total">{jobs.length} oportunidades</span>
        </div>
        <div className="kb-header-right">
          {/* Alterna entre o quadro (kanban) e o analytics (F7) */}
          <div className="kb-viewtoggle">
            <button className={`kb-vt-btn${boardView === 'board' ? ' active' : ''}`} onClick={() => setBoardView('board')}>Quadro</button>
            <button className={`kb-vt-btn${boardView === 'analytics' ? ' active' : ''}`} onClick={() => setBoardView('analytics')}>Analytics</button>
          </div>
          {boardView === 'board' && (
            <input
              type="text"
              className="kb-search-input"
              placeholder="buscar vagas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          )}
        </div>
      </div>

      {/* F1 — métricas agregadas do pipeline */}
      <HeaderMetrics jobs={jobs} get={get} />

      {boardView === 'analytics' ? (
        <PipelineAnalytics jobs={jobs} get={get} />
      ) : (
      <>
      {/* resumo por status — snapshot rápido do funil atual */}
      <StatusSummary byColumn={byColumn} />

      <KanbanFilterBar
        filters={filters}
        total={jobs.length}
        filtered={visible.length}
        onChange={setFilters}
      />

      {/* estatísticas de funil — calculadas sobre todas as vagas (sem filtro) */}
      <FunnelStats jobs={jobs} get={get} />

      <div className="kb-col-pills">
        {COLUMNS.map(col => (
          <button
            key={col.id}
            className={`kb-col-pill${activeMobileCol === col.id ? ' active' : ''}`}
            style={{ '--col-accent': col.accent } as React.CSSProperties}
            onClick={() => setActiveMobileCol(col.id)}
          >
            {col.label}
            <span className="kb-col-pill-count">{byColumn[col.id].length}</span>
          </button>
        ))}
      </div>

      <div className="kb-board">
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.id}
            column={col}
            jobs={byColumn[col.id]}
            isOver={dragOverCol === col.id}
            isActiveMobile={activeMobileCol === col.id}
            get={get}
            draggingId={draggingId}
            onDragOver={e => handleDragOver(e, col.id)}
            onDragLeave={e => handleDragLeave(e, col.id)}
            onDrop={e => handleDrop(e, col.id)}
            onCardDragStart={handleDragStart}
            onCardDragEnd={handleDragEnd}
            onCardClick={setSelectedJob}
            onToggleFavorite={(e, id) => { e.stopPropagation(); toggleFavorite(id); }}
          />
        ))}
      </div>
      </>
      )}

      {selectedJob && (
        <JobDetailPanel
          job={selectedJob}
          kd={get(selectedJob.id)}
          linkedInData={linkedInData}
          githubUsername={githubUsername}
          onClose={() => setSelectedJob(null)}
          onStatusChange={s => setStatus(selectedJob.id, s)}
          onNotesChange={n => setNotes(selectedJob.id, n)}
          onNextStepChange={(text, date) => setNextStep(selectedJob.id, text, date)}
          onGenerateCv={onGenerateCv}
          onViewCv={onViewCv}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
