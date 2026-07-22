import { CareerProfile, LinkedInData, UserPreferences } from '../types';
import { AuthUser } from '../services/auth';
import { View } from './TabNav';
import { CareerInsights } from './CareerInsights';
import { PreferencesPanel } from './PreferencesPanel';
import { AccountSettings } from './AccountSettings';
import { computeProfileScore, scoreColor } from '../utils/profileScore';

interface CareerDashboardProps {
  user: AuthUser | null;
  careerProfile: CareerProfile | null;
  linkedIn: LinkedInData | null;
  preferences: UserPreferences;
  onNavigate: (v: View) => void;
  onUpdate: (user: AuthUser) => void;
  onLinkedInUpdate: (data: LinkedInData) => void;
  onPreferencesChange: (p: UserPreferences) => void;
  onCareerRedo: () => void;
  onCareerEdit: (p: CareerProfile) => void;
}

interface QuickAction {
  view: View;
  label: string;
  desc: string;
  accent: 'blue' | 'purple' | 'green' | 'amber';
  icon: JSX.Element;
}

const IconSearch = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth="1.6" />
    <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const IconAnalyze = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M3 17V8M8 17V4M13 17v-6M18 17V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const IconBoard = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <rect x="2.5" y="2.5" width="5" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    <rect x="10" y="2.5" width="7.5" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    <rect x="10" y="11.5" width="7.5" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const QUICK_ACTIONS: QuickAction[] = [
  { view: 'buscar',  label: 'Buscar vagas',     desc: 'Encontre oportunidades compatíveis', accent: 'blue',   icon: <IconSearch /> },
  { view: 'analise', label: 'Analisar uma vaga', desc: 'Cole um link e veja seu match',       accent: 'purple', icon: <IconAnalyze /> },
  { view: 'history', label: 'Organizar',         desc: 'Acompanhe suas candidaturas',         accent: 'green',  icon: <IconBoard /> },
];

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
  onNavigate,
  onUpdate,
  onLinkedInUpdate,
  onPreferencesChange,
  onCareerRedo,
  onCareerEdit,
}: CareerDashboardProps) {
  const { score, dimensions, missing } = computeProfileScore(careerProfile, linkedIn, preferences);

  const R = 34;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - score / 100);
  const ringColor = scoreColor(score);

  const firstName = (user?.name ?? '').trim().split(/\s+/)[0] || null;
  const topNext = missing.slice(0, 3);

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
            return (
              <div key={d.key} className="cd-dim glass-card">
                <div className="cd-dim-head">
                  <span className="cd-dim-label">{d.label}</span>
                  <span className="cd-dim-pct" style={{ color }}>{d.pct}%</span>
                </div>
                <div className="cd-dim-track">
                  <div className="cd-dim-fill" style={{ width: `${d.pct}%`, background: color }} />
                </div>
                <span className="cd-dim-weight">peso {d.weight}%</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Próximos passos (só se há pendências) ── */}
      {topNext.length > 0 && (
        <section className="cd-next">
          <h2 className="cd-section-title">Próximos passos</h2>
          <div className="cd-next-list">
            {topNext.map((m) => (
              <button
                key={m.label}
                className="cd-next-item glass-card"
                onClick={() => m.hint && onNavigate(m.hint as View)}
              >
                <span className="cd-next-dot" />
                <span className="cd-next-label">{m.label}</span>
                <span className="cd-next-gain">+{m.weight}%</span>
                <span className="cd-next-arrow">→</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Ações rápidas ── */}
      <section className="cd-actions">
        <h2 className="cd-section-title">O que você quer fazer?</h2>
        <div className="cd-actions-grid">
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.view}
              className="cd-action-card glass-card"
              onClick={() => onNavigate(a.view)}
            >
              <span className={`cd-action-icon cd-action-icon--${a.accent}`}>{a.icon}</span>
              <span className="cd-action-label">{a.label}</span>
              <span className="cd-action-desc">{a.desc}</span>
            </button>
          ))}
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
        <PreferencesPanel
          preferences={preferences}
          onChange={onPreferencesChange}
          defaultOpen
        />
      </section>

      {/* ── Conta (só logado) ── */}
      {user && (
        <section className="cd-section-block">
          <h2 className="cd-section-title">Conta</h2>
          <AccountSettings
            user={user}
            linkedInData={linkedIn}
            onUpdate={onUpdate}
            onLinkedInUpdate={onLinkedInUpdate}
          />
        </section>
      )}
    </div>
  );
}
