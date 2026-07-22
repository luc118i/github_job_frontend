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

function DimensionBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="ci-dimension">
      <span className="ci-dim-label">{label}</span>
      <div className="ci-dim-track">
        <div className="ci-dim-fill" style={{ width: `${value * 100}%` }} />
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
}

function EditableTagList({ items, tagClass, placeholder, onAdd, onRemove, canEdit }: EditableTagListProps) {
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
            <DimensionBar label={`Lideranca — ${LEADERSHIP_LABEL[profile.leadershipLevel]}`} value={leadershipValue} />
            <DimensionBar label={`Tecnologia — ${TECH_LABEL[profile.techLiteracy]}`} value={techValue} />
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
      </div>
    </div>
  );
}
