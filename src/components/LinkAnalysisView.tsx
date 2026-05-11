import { useState } from 'react';
import { Profile, LinkedInData, JobRecord, MatchAnalysis } from '../types';
import { analyzeLink } from '../services/analyzeLink';

interface LinkAnalysisViewProps {
  profile: Profile | null;
  linkedIn: LinkedInData | null;
  onGenerateCv: (job: JobRecord, profile: Profile) => void;
}

type Step = 'idle' | 'loading' | 'done' | 'error';

interface AnalysisState {
  job: JobRecord;
  match: MatchAnalysis;
  atsKeywords: string[];
  requirements: string[];
  language: string | null;
}

function ScoreRing({ score }: { score: number }) {
  const level =
    score >= 80 ? 'excelente' :
    score >= 60 ? 'alto' :
    score >= 40 ? 'medio' : 'baixo';

  const colors: Record<string, string> = {
    excelente: '#06b6d4',
    alto:      '#7c3aed',
    medio:     '#f59e0b',
    baixo:     '#ef4444',
  };

  return (
    <div className="la-score-ring" style={{ '--score-color': colors[level] } as React.CSSProperties}>
      <span className="la-score-number">{score}</span>
      <span className="la-score-label">{level}</span>
    </div>
  );
}

function Pill({ text, variant }: { text: string; variant: 'strength' | 'gap' | 'keyword' | 'tag' }) {
  return <span className={`la-pill la-pill--${variant}`}>{text}</span>;
}

export function LinkAnalysisView({ profile, linkedIn, onGenerateCv }: LinkAnalysisViewProps) {
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisState | null>(null);

  const hasProfile = !!(profile || linkedIn?.positions?.length);

  async function handleAnalyze() {
    const trimmed = url.trim();
    if (!trimmed.startsWith('http')) {
      setError('Cole uma URL valida da vaga (comecando com https://)');
      return;
    }
    setStep('loading');
    setError('');
    setResult(null);

    try {
      const data = await analyzeLink({
        url: trimmed,
        githubUsername: profile?.user.login,
        githubBio: profile?.user.bio,
        skills: profile?.skills,
        repos: profile?.repos,
        linkedIn,
      });
      setResult(data);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao analisar vaga');
      setStep('error');
    }
  }

  function handleGenerateCv() {
    if (!result || !profile) return;
    onGenerateCv(result.job, profile);
  }

  return (
    <div className="la-view">
      <div className="la-header">
        <h2 className="la-title">
          Analise de Vaga por <span className="accent">Link</span>
        </h2>
        <p className="la-subtitle">
          Cole o link de qualquer vaga. A IA extrai os dados, calcula seu match e prepara o CV otimizado.
        </p>
      </div>

      {!hasProfile && (
        <div className="la-profile-warn">
          Importe seu LinkedIn ou conecte seu GitHub para calcular o match com a vaga.
        </div>
      )}

      <div className="la-input-row">
        <div className="search-bar la-url-bar">
          <span className="prefix">url</span>
          <input
            type="url"
            placeholder="https://gupy.io/companies/empresa/jobs/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && step !== 'loading' && handleAnalyze()}
            disabled={step === 'loading'}
          />
        </div>
        <button
          className="search-btn la-analyze-btn"
          onClick={handleAnalyze}
          disabled={step === 'loading' || !url.trim()}
        >
          {step === 'loading' ? 'analisando...' : 'analisar'}
        </button>
      </div>

      {step === 'loading' && (
        <div className="loading-bar" style={{ marginTop: 32 }}>
          <div className="loading-step"><div className="dot" /> acessando pagina da vaga...</div>
          <div className="loading-step"><div className="dot" style={{ animationDelay: '0.3s' }} /> extraindo dados e palavras-chave ATS...</div>
          <div className="loading-step"><div className="dot" style={{ animationDelay: '0.6s' }} /> calculando match com seu perfil...</div>
        </div>
      )}

      {(step === 'error') && (
        <div className="error-msg" style={{ marginTop: 16 }}>{error}</div>
      )}

      {step === 'done' && result && (
        <div className="la-result">
          {/* Job summary */}
          <div className="la-job-card">
            <div className="la-job-header">
              <div>
                <div className="la-job-title">{result.job.title}</div>
                <div className="la-job-company">{result.job.company}</div>
                <div className="la-job-meta">
                  <span className="la-badge">{result.job.level}</span>
                  <span className="la-badge">{result.job.remote ? 'Remoto' : result.job.location ?? 'Presencial'}</span>
                  {result.language && <span className="la-badge la-badge--lang">{result.language}</span>}
                  {result.job.salary && <span className="la-badge la-badge--salary">{result.job.salary}</span>}
                </div>
              </div>
              <ScoreRing score={result.match.score} />
            </div>

            <p className="la-job-desc">{result.job.description}</p>

            <div className="la-skills-row">
              {result.job.skills.map((s) => <Pill key={s} text={s} variant="tag" />)}
            </div>

            <a
              href={result.job.link ?? url}
              target="_blank"
              rel="noopener noreferrer"
              className="la-view-job-link"
            >
              Ver vaga original
            </a>
          </div>

          {/* Match breakdown */}
          <div className="la-section-grid">
            <div className="la-section">
              <div className="la-section-title">Pontos fortes</div>
              <ul className="la-list">
                {result.match.strengths.map((s, i) => (
                  <li key={i} className="la-list-item la-list-item--positive">{s}</li>
                ))}
              </ul>
            </div>

            <div className="la-section">
              <div className="la-section-title">Gaps identificados</div>
              <ul className="la-list">
                {result.match.gaps.length
                  ? result.match.gaps.map((g, i) => (
                      <li key={i} className="la-list-item la-list-item--negative">{g}</li>
                    ))
                  : <li className="la-list-item la-list-item--positive">Sem gaps relevantes identificados</li>
                }
              </ul>
            </div>
          </div>

          {result.match.missingKeywords.length > 0 && (
            <div className="la-section">
              <div className="la-section-title">Palavras-chave ATS ausentes no seu perfil</div>
              <div className="la-pills-row">
                {result.match.missingKeywords.map((k) => <Pill key={k} text={k} variant="keyword" />)}
              </div>
            </div>
          )}

          {result.atsKeywords.length > 0 && (
            <div className="la-section">
              <div className="la-section-title">Palavras-chave ATS da vaga</div>
              <div className="la-pills-row">
                {result.atsKeywords.map((k) => <Pill key={k} text={k} variant="tag" />)}
              </div>
            </div>
          )}

          <div className="la-section">
            <div className="la-section-title">Recomendacoes</div>
            <ul className="la-list">
              {result.match.recommendations.map((r, i) => (
                <li key={i} className="la-list-item la-list-item--rec">{r}</li>
              ))}
            </ul>
          </div>

          <div className="la-insights">
            <div className="la-insight-item">
              <span className="la-insight-label">Competitividade</span>
              <span className="la-insight-value">{result.match.competitiveness}</span>
            </div>
            <div className="la-insight-item">
              <span className="la-insight-label">Chance de entrevista</span>
              <span className="la-insight-value">{result.match.interviewChance}</span>
            </div>
          </div>

          {result.requirements.length > 0 && (
            <div className="la-section">
              <div className="la-section-title">Requisitos da vaga</div>
              <ul className="la-list">
                {result.requirements.map((r, i) => (
                  <li key={i} className="la-list-item">{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="la-actions">
            {profile ? (
              <button className="search-btn" onClick={handleGenerateCv}>
                gerar CV otimizado para esta vaga
              </button>
            ) : (
              <p className="la-profile-warn">
                Conecte seu GitHub para gerar o CV otimizado.
              </p>
            )}
            <button
              className="la-reanalyze-btn"
              onClick={() => { setStep('idle'); setResult(null); setUrl(''); }}
            >
              analisar outra vaga
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
