import { Step } from '../types';

interface LoadingStepsProps {
  step: Step;
}

export function LoadingSteps({ step }: LoadingStepsProps) {
  return (
    <div className="loading-bar">
      <div className="loading-step">
        <div className="dot" />
        analisando perfil do github
      </div>
      {step === 'jobs' && (
        <div className="loading-step">
          <div className="dot" style={{ animationDelay: '0.2s' }} />
          buscando vagas compatíveis com ia
        </div>
      )}
    </div>
  );
}
