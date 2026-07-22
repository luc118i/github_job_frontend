import { CareerProfile, LinkedInData, UserPreferences } from '../types';
import { AuthUser } from '../services/auth';
import { CareerInsights } from './CareerInsights';
import { PreferencesPanel } from './PreferencesPanel';
import { AccountSettings } from './AccountSettings';
import { computeProfileScore, scoreColor } from '../utils/profileScore';

interface CareerDashboardProps {
  user: AuthUser | null;
  careerProfile: CareerProfile | null;
  linkedIn: LinkedInData | null;
  preferences: UserPreferences;
  onUpdate: (user: AuthUser) => void;
  onLinkedInUpdate: (data: LinkedInData) => void;
  onPreferencesChange: (p: UserPreferences) => void;
  onCareerRedo: () => void;
  onCareerEdit: (p: CareerProfile) => void;
}

/**
 * Área única "Minha Carreira" — agrega TUDO do candidato num só lugar:
 * resumo (header de 5s), score de perfil, próximos passos, ações rápidas,
 * perfil de carreira analisado pela IA, preferências de busca e conta.
 * Substitui a antiga view "perfil" (fusão proposta no MVC).
 */
export function CareerDashboard({
  user,
  careerProfile,
  linkedIn,
  preferences,
  onUpdate,
  onLinkedInUpdate,
  onPreferencesChange,
  onCareerRedo,
  onCareerEdit,
}: CareerDashboardProps) {
  const { score, dimensions } = computeProfileScore(careerProfile, linkedIn, preferences);

  const R = 34;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - score / 100);
  const ringColor = scoreColor(score);

  const firstName = (user?.name ?? '').trim().split(/\s+/)[0] || null;

  // ── Linha de stats (resumo de 5s, MVC) ──
  // Optional chaining no array também: profile vindo do servidor pode ter campos undefined.
  const nExp = linkedIn?.positions?.length ?? 0;
  const nSkills = careerProfile?.hiddenSkills?.length ?? 0;
  const nCert = linkedIn?.certifications?.length ?? 0;
  const stats = [
    { n: nExp,    label: nExp === 1 ? 'experiência' : 'experiências' },
    { n: nSkills, label: nSkills === 1 ? 'competência' : 'competências' },
    { n: nCert,   label: nCert === 1 ? 'certificação' : 'certificações' },
  ];

  return (
    <div className="cd-root">
      {/* ── Cabeçalho com saudação + score ── */}
      <section className="cd-hero glass-card">
        <div className="cd-hero-text">
          <span className="cd-eyebrow">Minha Carreira</span>
          <h1 className="cd-greeting">
            {firstName ? <>Olá, <span className="cd-name">{firstName}</span>.</> : 'Olá.'}
          </h1>
          <p className="cd-tagline">
            {score >= 100
              ? 'Seu perfil está completo — a IA tem tudo para acertar nas vagas.'
              : 'Aqui está o resumo da sua jornada. Complete o perfil para resultados mais certeiros.'}
          </p>

          {/* Resumo de 5 segundos */}
          <div className="cd-stats">
            {stats.map((s) => (
              <span key={s.label} className="cd-stat">
                <strong className="cd-stat-n">{s.n}</strong> {s.label}
              </span>
            ))}
          </div>
        </div>

        <div className="cd-score">
          <div className="cd-score-ring-wrap">
            <svg className="cd-score-ring" width="88" height="88" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r={R} className="cd-score-track" />
              <circle
                cx="44" cy="44" r={R}
                className="cd-score-fill"
                style={{ stroke: ringColor, strokeDasharray: C, strokeDashoffset: offset }}
              />
            </svg>
            <span className="cd-score-pct" style={{ color: ringColor }}>{score}%</span>
          </div>
          <span className="cd-score-label">perfil completo</span>
        </div>
      </section>

      {/* ── Career Score detalhado (5 dimensões) ── */}
      <section className="cd-dims">
        <h2 className="cd-section-title">Career Score</h2>
        <div className="cd-dims-grid">
          {dimensions.map((d) => {
            const color = scoreColor(d.pct);
            const nextItem = d.pct < 100 ? d.items.find((it) => !it.done) : undefined;
            return (
              <div key={d.key} className="cd-dim glass-card">
                <div className="cd-dim-head">
                  <span className="cd-dim-label">{d.label}</span>
                  <span className="cd-dim-pct" style={{ color }}>{d.pct}%</span>
                </div>
                <div className="cd-dim-track">
                  <div className="cd-dim-fill" style={{ width: `${d.pct}%`, background: color }} />
                </div>
                {nextItem ? (
                  <span className="cd-dim-next">Falta: {nextItem.label}</span>
                ) : (
                  <span className="cd-dim-weight">peso {d.weight}%</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Perfil de carreira analisado pela IA ── */}
      {careerProfile && (
        <section className="cd-profile">
          <h2 className="cd-section-title">Seu perfil de carreira</h2>
          <CareerInsights
            profile={careerProfile}
            onRedo={onCareerRedo}
            onEdit={onCareerEdit}
          />
        </section>
      )}

      {/* ── Preferências de busca ── */}
      <section className="cd-section-block">
        <h2 className="cd-section-title">Preferências de busca</h2>
        <p className="cd-section-hint">
          Modalidade, localização, faixa salarial e nível. Usadas em todas as buscas.
        </p>
        <div className="cd-block-card glass-card">
          <PreferencesPanel
            preferences={preferences}
            onChange={onPreferencesChange}
            defaultOpen
          />
        </div>
      </section>

      {/* ── Conta (só logado) ── */}
      {user && (
        <section className="cd-section-block">
          <h2 className="cd-section-title">Conta</h2>
          <div className="cd-block-card glass-card">
            <AccountSettings
              user={user}
              linkedInData={linkedIn}
              onUpdate={onUpdate}
              onLinkedInUpdate={onLinkedInUpdate}
            />
          </div>
        </section>
      )}
    </div>
  );
}
