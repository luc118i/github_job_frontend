import { useEffect, useState } from 'react';

interface AiAnalysisPanelProps {
  /** Termo buscado, exibido no cabeçalho do painel. */
  term?: string;
  /** Se há currículo (CV/LinkedIn) importado de verdade. */
  hasCv?: boolean;
  /** Se há perfil de carreira analisado pela IA. */
  hasProfile?: boolean;
}

const STEPS_GENERIC = [
  'Interpretando o que você procura…',
  'Vasculhando vagas em múltiplas fontes…',
  'Removendo duplicadas e vagas expiradas…',
  'Verificando fontes e links das vagas…',
  'Organizando os melhores resultados…',
];

/** Monta os passos de forma honesta: só fala em "currículo" se houver CV. */
function buildSteps(hasCv?: boolean, hasProfile?: boolean): string[] {
  const reading =
    hasCv && hasProfile ? 'Lendo seu currículo e perfil de carreira…'
    : hasCv ? 'Lendo seu currículo…'
    : hasProfile ? 'Analisando seu perfil de carreira…'
    : null;

  if (!reading) return STEPS_GENERIC;

  return [
    reading,
    'Cruzando suas habilidades com o mercado…',
    'Filtrando vagas compatíveis com seu nível…',
    'Verificando fontes e links das vagas…',
    'Calculando compatibilidade de cada vaga…',
  ];
}

/**
 * Painel "🤖 IA analisando" exibido durante a busca.
 * Cicla mensagens de progresso para dar sensação de trabalho em tempo real
 * (a busca real não expõe progresso granular — isto é percepção, não fake de dados).
 */
export function AiAnalysisPanel({ term, hasCv, hasProfile }: AiAnalysisPanelProps) {
  const steps = buildSteps(hasCv, hasProfile);
  const title = hasCv || hasProfile ? 'IA analisando seu perfil' : 'IA buscando vagas';
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((i) => Math.min(i + 1, steps.length - 1));
    }, 1400);
    return () => clearInterval(id);
  }, [steps.length]);

  return (
    <div className="aip glass-card">
      <div className="aip-head">
        <span className="aip-orb" aria-hidden>
          <span className="aip-orb-core" />
        </span>
        <div className="aip-head-text">
          <span className="aip-title">{title}</span>
          {term && <span className="aip-term">buscando “{term}”</span>}
        </div>
      </div>

      <ul className="aip-steps">
        {steps.map((s, i) => {
          const state = i < active ? 'done' : i === active ? 'active' : 'pending';
          return (
            <li key={s} className={`aip-step aip-step--${state}`}>
              <span className="aip-step-marker" aria-hidden />
              {s}
            </li>
          );
        })}
      </ul>

      <div className="aip-bar">
        <div
          className="aip-bar-fill"
          style={{ width: `${((active + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
