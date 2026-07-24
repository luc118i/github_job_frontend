import { useState } from 'react';
import { CareerProfile, WorkStyle } from '../types';

interface Props {
  profile: CareerProfile;
  onRedo: () => void;
  onRefine?: () => void;
  onEdit?: (updated: CareerProfile) => void;
}

const WORK_STYLE_LABEL: Record<WorkStyle, string> = {
  analytical: 'Analítico',
  creative: 'Criativo',
  operational: 'Operacional',
  relational: 'Relacional',
};

const TECH_LABEL: Record<string, string> = {
  basic: 'Básico',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

const LEADERSHIP_LABEL: Record<string, string> = {
  low: 'Baixa',
  medium: 'Moderada',
  high: 'Alta',
};

function normalizeTag(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .trim();
}

function IconChip() {
  return (
    <svg className="ci-tag-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4.5" y="4.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 2v2M10 2v2M6 12v2M10 12v2M2 6h2M2 10h2M12 6h2M12 10h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconDatabase() {
  return (
    <svg className="ci-tag-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="8" cy="4" rx="5" ry="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 4v8c0 1.1 2.24 2 5 2s5-.9 5-2V4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 8c0 1.1 2.24 2 5 2s5-.9 5-2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg className="ci-tag-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function IconLayout() {
  return (
    <svg className="ci-tag-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2.5" width="12" height="11" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 6.5h12M6 6.5v7" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function IconHexNode() {
  return (
    <svg className="ci-tag-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1.5 14 5v6l-6 3.5L2 11V5l6-3.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8 5v6M5.5 3.5 8 5l2.5-1.5M5.5 12.5 8 11l2.5 1.5" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

function IconBraces() {
  return (
    <svg className="ci-tag-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 2.5c-1.4 0-2 .6-2 2v2c0 .8-.3 1.5-1.5 1.5 1.2 0 1.5.7 1.5 1.5v2c0 1.4.6 2 2 2M10 2.5c1.4 0 2 .6 2 2v2c0 .8.3 1.5 1.5 1.5-1.2 0-1.5.7-1.5 1.5v2c0 1.4-.6 2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAtom() {
  return (
    <svg className="ci-tag-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
      <ellipse cx="8" cy="8" rx="6.5" ry="2.6" stroke="currentColor" strokeWidth="1.1" />
      <ellipse cx="8" cy="8" rx="6.5" ry="2.6" stroke="currentColor" strokeWidth="1.1" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="6.5" ry="2.6" stroke="currentColor" strokeWidth="1.1" transform="rotate(120 8 8)" />
    </svg>
  );
}

const TAG_ICON_MATCHERS: { test: RegExp; icon: () => JSX.Element }[] = [
  { test: /node/, icon: IconHexNode },
  { test: /react/, icon: IconAtom },
  { test: /(^|\W)(js|javascript|typescript|ts)(\W|$)/, icon: IconBraces },
  { test: /(^|\W)ux(\W|$)/, icon: IconEye },
  { test: /(^|\W)ui(\W|$)/, icon: IconLayout },
  { test: /dados|data/, icon: IconDatabase },
  { test: /(^|\W)t\.?i\.?(\W|$)|tecnologia|tech/, icon: IconChip },
];

function getTagIcon(label: string): JSX.Element | null {
  const n = normalizeTag(label);
  const match = TAG_ICON_MATCHERS.find((m) => m.test.test(n));
  return match ? match.icon() : null;
}

function levelLabel(value: number): string {
  if (value >= 0.75) return 'Alta';
  if (value >= 0.45) return 'Moderada';
  return 'Baixa';
}

type DimensionTone = 'tech' | 'creativity' | 'leadership';

function DimensionBar({ label, value, tone }: { label: string; value: number; tone: DimensionTone }) {
  return (
    <div className="ci-dimension">
      <span className="ci-dim-label">{label}</span>
      <div className="ci-dim-track">
        <div className={`ci-dim-fill ci-dim-fill--${tone}`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

function IconCheck() {
  return (
    <svg className="ci-stat-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 8.5L6.2 11.5L13 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg className="ci-stat-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 2L14.5 13H1.5L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 6.5V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.2" r="0.9" fill="currentColor" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg className="ci-stat-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8 1.5L9.9 5.6L14.5 6.2L11.2 9.3L12 13.8L8 11.7L4 13.8L4.8 9.3L1.5 6.2L6.1 5.6L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  return (
    <div className="ci-score-ring">
      <svg viewBox="0 0 100 100" width="104" height="104">
        <circle cx="50" cy="50" r={radius} className="ci-score-track" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="ci-score-fill"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ci-score-center">
        <span className="ci-score-number">{score}</span>
        <span className="ci-score-label">{label}</span>
      </div>
    </div>
  );
}

interface EditableTagListProps {
  items: string[];
  tagClass: string;
  placeholder: string;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  canEdit: boolean;
  withIcons?: boolean;
}

function EditableTagList({ items, tagClass, placeholder, onAdd, onRemove, canEdit, withIcons }: EditableTagListProps) {
  const [input, setInput] = useState('');

  function handleAdd() {
    const v = input.trim();
    if (!v || items.includes(v)) return;
    onAdd(v);
    setInput('');
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
  }

  return (
    <div className="ci-tag-editor">
      <div className="ci-tags">
        {items.map((a) => (
          <span key={a} className={`ci-tag ${tagClass}`}>
            {withIcons && getTagIcon(a)}
            {a}
            {canEdit && (
              <button
                className="ci-tag-remove"
                onClick={() => onRemove(a)}
                title="Remover"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {items.length === 0 && (
          <span className="ci-tag-empty">nenhum</span>
        )}
      </div>
      {canEdit && (
        <div className="ci-tag-input-row">
          <input
            className="ci-tag-input"
            type="text"
            placeholder={placeholder}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            maxLength={48}
          />
          <button
            className="ci-tag-add-btn"
            onClick={handleAdd}
            disabled={!input.trim()}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

export function CareerInsights({ profile, onRedo, onRefine, onEdit }: Props) {
  const leadershipValue = { low: 0.25, medium: 0.6, high: 0.95 }[profile.leadershipLevel] ?? 0.5;
  const techValue = { basic: 0.2, intermediate: 0.55, advanced: 0.95 }[profile.techLiteracy] ?? 0.5;
  const canEdit = !!onEdit;

  // Normaliza arrays — profile vindo do servidor pode ter campos undefined.
  const workStyle = profile.workStyle ?? [];
  const desiredAreas = profile.desiredAreas ?? [];
  const blockedAreas = profile.blockedAreas ?? [];
  const hiddenSkills = profile.hiddenSkills ?? [];

  // Criatividade não vem do backend — deriva do estilo de trabalho declarado.
  const creativityValue = workStyle.includes('creative')
    ? (workStyle.includes('analytical') ? 0.85 : 0.7)
    : (workStyle.length > 0 ? 0.4 : 0.35);

  const overallScore = Math.round(
    (techValue * 0.4 + creativityValue * 0.3 + leadershipValue * 0.3) * 100
  );
  const overallLabel =
    overallScore >= 85 ? 'Excelente' : overallScore >= 65 ? 'Bom' : overallScore >= 45 ? 'Moderado' : 'Inicial';

  function updateDesired(areas: string[]) {
    onEdit?.({ ...profile, desiredAreas: areas });
  }

  function updateBlocked(areas: string[]) {
    onEdit?.({ ...profile, blockedAreas: areas });
  }

  return (
    <div className="ci-card glass-card">
      {/* Header */}
      <div className="ci-header">
        <div className="ci-header-left">
          <div className="ci-dot" />
          <span className="ci-header-title">Perfil de Carreira</span>
          {profile.transitionReady && profile.transitionTarget && (
            <span className="ci-transition-badge">em transicao para {profile.transitionTarget}</span>
          )}
        </div>
        <div className="ci-header-actions">
          {onRefine && (
            <button className="ci-refine-btn" onClick={onRefine}>
              ajustar perfil
            </button>
          )}
          <button className="ci-redo-btn" onClick={onRedo}>
            refazer analise
          </button>
        </div>
      </div>

      {/* Summaries */}
      <div className="ci-summaries">
        <p className="ci-summary-main">{profile.personalitySummary}</p>
        {profile.potentialSummary && (
          <p className="ci-summary-potential">{profile.potentialSummary}</p>
        )}
      </div>

      {/* Goal */}
      {profile.careerGoals && (
        <div className="ci-goal">
          <span className="ci-section-label">objetivo</span>
          <span className="ci-goal-text">{profile.careerGoals}</span>
        </div>
      )}

      <div className="ci-columns">
        {/* Left column */}
        <div className="ci-col">
          {/* Work style */}
          <div className="ci-section">
            <span className="ci-section-label">estilo de trabalho</span>
            <div className="ci-tags">
              {workStyle.map((s) => (
                <span key={s} className="ci-tag ci-tag--style">
                  {WORK_STYLE_LABEL[s] ?? s}
                </span>
              ))}
            </div>
          </div>

          {/* Desired areas — editable */}
          <div className="ci-section">
            <span className="ci-section-label">quer explorar</span>
            <EditableTagList
              items={desiredAreas}
              tagClass="ci-tag--desired"
              placeholder="ex: produto, UX, dados..."
              canEdit={canEdit}
              withIcons
              onAdd={(v) => updateDesired([...desiredAreas, v])}
              onRemove={(v) => updateDesired(desiredAreas.filter(a => a !== v))}
            />
          </div>

          {/* Blocked areas — editable */}
          <div className="ci-section">
            <span className="ci-section-label">nao quer mais</span>
            <EditableTagList
              items={blockedAreas}
              tagClass="ci-tag--blocked"
              placeholder="ex: logistica, suporte..."
              canEdit={canEdit}
              onAdd={(v) => updateBlocked([...blockedAreas, v])}
              onRemove={(v) => updateBlocked(blockedAreas.filter(a => a !== v))}
            />
          </div>
        </div>

        {/* Right column */}
        <div className="ci-col">
          {/* Dimensions */}
          <div className="ci-section">
            <span className="ci-section-label">dimensoes</span>
            <DimensionBar
              label={`Tecnologia — ${TECH_LABEL[profile.techLiteracy]}`}
              value={techValue}
              tone="tech"
            />
            <DimensionBar
              label={`Criatividade — ${levelLabel(creativityValue)}`}
              value={creativityValue}
              tone="creativity"
            />
            <DimensionBar
              label={`Lideranca — ${LEADERSHIP_LABEL[profile.leadershipLevel]}`}
              value={leadershipValue}
              tone="leadership"
            />
          </div>

          {/* Hidden skills */}
          {hiddenSkills.length > 0 && (
            <div className="ci-section">
              <span className="ci-section-label">habilidades ocultas</span>
              <div className="ci-tags">
                {hiddenSkills.map((s) => (
                  <span key={s} className="ci-tag ci-tag--hidden">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — resumo do perfil */}
        <div className="ci-col">
          <div className="ci-section">
            <span className="ci-section-label">resumo do perfil</span>
            <div className="ci-summary-card">
              <ScoreRing score={overallScore} label={overallLabel} />
              <ul className="ci-stat-list">
                <li className="ci-stat-item ci-stat-item--positive">
                  <IconCheck />
                  {desiredAreas.length} {desiredAreas.length === 1 ? 'área de interesse' : 'áreas de interesse'}
                </li>
                {blockedAreas.length > 0 && (
                  <li className="ci-stat-item ci-stat-item--warning">
                    <IconWarning />
                    {blockedAreas.length} {blockedAreas.length === 1 ? 'área para evitar' : 'áreas para evitar'}
                  </li>
                )}
                {hiddenSkills.length > 0 && (
                  <li className="ci-stat-item ci-stat-item--highlight">
                    <IconStar />
                    {hiddenSkills.length} {hiddenSkills.length === 1 ? 'habilidade de destaque' : 'habilidades de destaque'}
                  </li>
                )}
              </ul>
            </div>
          </div>

          {hiddenSkills.length > 0 && (
            <div className="ci-section">
              <span className="ci-section-label">habilidade em destaque</span>
              <div className="ci-highlight-card">
                <IconStar />
                <div className="ci-highlight-body">
                  <span className="ci-highlight-title">{hiddenSkills[0]}</span>
                  <span className="ci-highlight-desc">
                    Competência identificada com base no seu perfil que pode ser um diferencial.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
