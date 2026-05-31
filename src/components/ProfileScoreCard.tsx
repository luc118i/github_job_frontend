import { CareerProfile, LinkedInData, UserPreferences } from '../types';
import { View } from './TabNav';
import { computeProfileScore, scoreColor } from '../utils/profileScore';

interface ProfileScoreCardProps {
  careerProfile: CareerProfile | null;
  linkedIn: LinkedInData | null;
  preferences?: UserPreferences | null;
  onNavigate: (v: View) => void;
}

const LEVEL_LABEL: Record<'baixo' | 'medio' | 'bom' | 'alto', string> = {
  baixo: 'Perfil incompleto',
  medio: 'Quase lá',
  bom: 'Perfil forte',
  alto: 'Perfil completo',
};

/**
 * Card de "Profile Score" — mostra o quão completo está o perfil do usuário
 * num anel circular animado, listando o que ainda falta para a IA acertar mais.
 */
export function ProfileScoreCard({ careerProfile, linkedIn, preferences, onNavigate }: ProfileScoreCardProps) {
  const { score, missing, level } = computeProfileScore(careerProfile, linkedIn, preferences);

  // Anel SVG — circunferência de um raio 26
  const R = 26;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - score / 100);

  // Cor semântica por faixa (0–49 vermelho · 50–74 amarelo · 75–89 azul · 90–100 verde)
  const ringColor = scoreColor(score);

  const topMissing = missing.slice(0, 3);

  return (
    <div className="psc-card glass-card">
      <div className="psc-ring-wrap">
        <svg className="psc-ring" width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={R} className="psc-ring-track" />
          <circle
            cx="36"
            cy="36"
            r={R}
            className="psc-ring-fill"
            style={{
              stroke: ringColor,
              strokeDasharray: C,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        <span className="psc-ring-pct" style={{ color: ringColor }}>{score}%</span>
      </div>

      <div className="psc-body">
        <div className="psc-head">
          <span className="psc-title">{LEVEL_LABEL[level]}</span>
          <span className="psc-sub">
            {score >= 100
              ? 'A IA tem tudo que precisa para acertar nas vagas.'
              : 'Complete seu perfil para resultados mais precisos.'}
          </span>
        </div>

        {topMissing.length > 0 && (
          <div className="psc-missing">
            {topMissing.map((m) => (
              <button
                key={m.label}
                className="psc-missing-chip"
                onClick={() => m.hint && onNavigate(m.hint as View)}
              >
                <span className="psc-missing-dot" />
                {m.label}
                <span className="psc-missing-plus">+{m.weight}%</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
