import { CareerProfile, WorkStyle } from '../types';

interface Props {
  profile: CareerProfile;
  onRedo: () => void;
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

export function CareerInsights({ profile, onRedo }: Props) {
  const leadershipValue = { low: 0.25, medium: 0.6, high: 0.95 }[profile.leadershipLevel] ?? 0.5;
  const techValue = { basic: 0.2, intermediate: 0.55, advanced: 0.95 }[profile.techLiteracy] ?? 0.5;

  return (
    <div className="ci-card">
      {/* Header */}
      <div className="ci-header">
        <div className="ci-header-left">
          <div className="ci-dot" />
          <span className="ci-header-title">Perfil de Carreira</span>
          {profile.transitionReady && profile.transitionTarget && (
            <span className="ci-transition-badge">em transicao para {profile.transitionTarget}</span>
          )}
        </div>
        <button className="ci-redo-btn" onClick={onRedo}>
          refazer analise
        </button>
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
              {profile.workStyle.map((s) => (
                <span key={s} className="ci-tag ci-tag--style">
                  {WORK_STYLE_LABEL[s] ?? s}
                </span>
              ))}
            </div>
          </div>

          {/* Desired areas */}
          {profile.desiredAreas.length > 0 && (
            <div className="ci-section">
              <span className="ci-section-label">quer explorar</span>
              <div className="ci-tags">
                {profile.desiredAreas.map((a) => (
                  <span key={a} className="ci-tag ci-tag--desired">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* Blocked areas */}
          {profile.blockedAreas.length > 0 && (
            <div className="ci-section">
              <span className="ci-section-label">nao quer mais</span>
              <div className="ci-tags">
                {profile.blockedAreas.map((a) => (
                  <span key={a} className="ci-tag ci-tag--blocked">{a}</span>
                ))}
              </div>
            </div>
          )}
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
          {profile.hiddenSkills.length > 0 && (
            <div className="ci-section">
              <span className="ci-section-label">habilidades ocultas</span>
              <div className="ci-tags">
                {profile.hiddenSkills.map((s) => (
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
