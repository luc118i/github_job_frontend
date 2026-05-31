import { useState } from 'react';
import { CareerProfile, LinkedInData } from '../types';
import { LinkedInImport } from './LinkedInImport';
import { CareerChat } from './CareerChat';

interface Props {
  onComplete: (profile: CareerProfile, linkedIn?: LinkedInData) => void;
  onSkip: () => void;
}

type Step = 'upload' | 'chat' | 'done';

export function OnboardingView({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [linkedIn, setLinkedIn] = useState<LinkedInData | null>(null);
  const [profile, setProfile] = useState<CareerProfile | null>(null);

  function handleImport(data: LinkedInData) {
    setLinkedIn(data);
  }

  function handleChatComplete(p: CareerProfile) {
    setProfile(p);
    setStep('done');
  }

  function handleFinish() {
    if (profile) onComplete(profile, linkedIn ?? undefined);
  }

  const steps = ['Currículo', 'Análise', 'Pronto'];
  const stepIndex = step === 'upload' ? 0 : step === 'chat' ? 1 : 2;

  return (
    <div className="onb-root">
      <div className="onb-container">

        {/* Progress */}
        <div className="onb-progress">
          {steps.map((s, i) => (
            <div key={s} className={`onb-step${i <= stepIndex ? ' onb-step--active' : ''}${i < stepIndex ? ' onb-step--done' : ''}`}>
              <div className="onb-step-dot">
                {i < stepIndex ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (i + 1)}
              </div>
              <span className="onb-step-label">{s}</span>
            </div>
          ))}
          <div className="onb-progress-line">
            <div className="onb-progress-fill" style={{ width: `${(stepIndex / (steps.length - 1)) * 100}%` }} />
          </div>
        </div>

        {/* ── Step 1: Upload ── */}
        {step === 'upload' && (
          <div className="onb-card">
            <div className="onb-icon">📄</div>
            <h1 className="onb-title">Vamos conhecer você</h1>
            <p className="onb-subtitle">
              Faça o upload do seu currículo ou perfil LinkedIn para começar.
              Isso ajuda a encontrar as melhores vagas para o seu perfil.
            </p>

            <div className="onb-import-wrap">
              <LinkedInImport
                data={linkedIn}
                onImport={handleImport}
                onClear={() => setLinkedIn(null)}
              />
            </div>

            {linkedIn && (
              <div className="onb-import-success">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#22c55e" strokeWidth="1.5"/>
                  <path d="M5 8l2.5 2.5L11 5.5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Currículo carregado: {linkedIn.name ?? 'perfil importado'}
              </div>
            )}

            <div className="onb-actions">
              <button className="onb-btn onb-btn--primary" onClick={() => setStep('chat')}>
                {linkedIn ? 'Continuar com análise de IA' : 'Continuar sem currículo'}
              </button>
              <button className="onb-btn onb-btn--ghost" onClick={onSkip}>
                Pular configuração
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Chat ── */}
        {step === 'chat' && (
          <div className="onb-chat-wrap">
            <p className="onb-chat-intro">
              Responda algumas perguntas rápidas para montarmos seu perfil profissional.
            </p>
            <CareerChat
              linkedIn={linkedIn}
              onComplete={handleChatComplete}
              onClose={onSkip}
            />
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 'done' && profile && (
          <div className="onb-card onb-card--done">
            <div className="onb-done-icon">✓</div>
            <h1 className="onb-title">Perfil criado com sucesso!</h1>
            <p className="onb-subtitle">
              Agora vou buscar vagas alinhadas com o seu perfil. Você pode ajustar
              suas preferências a qualquer momento em <strong>Perfil</strong>.
            </p>

            <div className="onb-profile-summary">
              <div className="onb-summary-item">
                <span className="onb-summary-label">Objetivo</span>
                <span className="onb-summary-value">{profile.careerGoals}</span>
              </div>
              {profile.desiredAreas.length > 0 && (
                <div className="onb-summary-item">
                  <span className="onb-summary-label">Áreas de interesse</span>
                  <div className="onb-summary-tags">
                    {profile.desiredAreas.slice(0, 4).map(a => (
                      <span key={a} className="onb-tag">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {profile.hiddenSkills.length > 0 && (
                <div className="onb-summary-item">
                  <span className="onb-summary-label">Seus pontos fortes</span>
                  <div className="onb-summary-tags">
                    {profile.hiddenSkills.slice(0, 3).map(s => (
                      <span key={s} className="onb-tag onb-tag--green">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="onb-btn onb-btn--primary onb-btn--large" onClick={handleFinish}>
              Ver vagas para mim →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
