import { useEffect, useState } from 'react';
import { Profile, LinkedInData, JobRecord, MatchAnalysis } from '../types';
import { analyzeLink } from '../services/analyzeLink';
import { fetchProjects } from '../services/projects';
import { rankProjects, matchTier, ProjectMatch } from '../utils/projectMatch';

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
  contactEmail: string | null;
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
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisState | null>(null);
  // Projetos da biblioteca relevantes para a vaga analisada (match determinístico).
  const [relevant, setRelevant] = useState<ProjectMatch[]>([]);

  const hasProfile = !!(profile || linkedIn?.positions?.length);

  // Ao concluir a análise, ranqueia os projetos do usuário pela vaga.
  useEffect(() => {
    if (!result) { setRelevant([]); return; }
    let alive = true;
    fetchProjects()
      .then((projs) => {
        if (!alive) return;
        const ranked = rankProjects(projs, {
          title: result.job.title, skills: result.job.skills, description: result.job.description,
        }).filter((r) => r.score > 0).slice(0, 3);
        setRelevant(ranked);
      })
      .catch(() => { if (alive) setRelevant([]); });
    return () => { alive = false; };
  }, [result]);

  async function handleAnalyze() {
    const trimmedUrl = url.trim();
    const trimmedText = pastedText.trim();

    if (pasteMode) {
      if (!trimmedText) {
        setError('Cole a descrição da vaga');
        return;
      }
    } else if (!trimmedUrl.startsWith('http')) {
      setError('Cole uma URL válida da vaga (começando com https://)');
      return;
    }

    setStep('loading');
    setError('');
    setResult(null);

    try {
      const data = await analyzeLink({
        url: pasteMode ? undefined : trimmedUrl,
        text: pasteMode ? trimmedText : undefined,
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
    if (!result) return;
    // Sem perfil do GitHub (usuário só importou LinkedIn ou preencheu manualmente) —
    // monta um perfil sintético pra não bloquear a geração de CV.
    const cvProfile: Profile = profile ?? {
      user: {
        login: '',
        name: linkedIn?.name ?? null,
        bio: null,
        avatar_url: '',
        followers: 0,
        public_repos: 0,
      },
      repos: [],
      skills: linkedIn?.skills ?? result.job.skills,
    };
    onGenerateCv(result.job, cvProfile);
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

      {pasteMode ? (
        <div className="la-input-row la-input-row--paste">
          <textarea
            className="auth-input la-paste-textarea"
            placeholder="Cole aqui a descrição da vaga (copiada da página)"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={6}
            disabled={step === 'loading'}
          />
          <div className="la-input-row">
            <button
              className="la-mode-toggle"
              onClick={() => { setPasteMode(false); setPastedText(''); setError(''); }}
              disabled={step === 'loading'}
            >
              usar link em vez disso
            </button>
            <button
              className="search-btn la-analyze-btn"
              onClick={handleAnalyze}
              disabled={step === 'loading' || !pastedText.trim()}
            >
              {step === 'loading' ? 'analisando...' : 'analisar'}
            </button>
          </div>
        </div>
      ) : (
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
      )}

      {!pasteMode && (
        <button
          className="la-mode-toggle"
          onClick={() => { setPasteMode(true); setUrl(''); setError(''); }}
          disabled={step === 'loading'}
        >
          o site bloqueou o acesso? cole a descrição da vaga
        </button>
      )}

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

            <div className="la-job-links">
              {(result.job.link ?? url) && (
                <a
                  href={result.job.link ?? url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="la-view-job-link"
                >
                  Ver vaga original
                </a>
              )}
              {result.contactEmail && (
                <a href={`mailto:${result.contactEmail}`} className="la-contact-email">
                  Candidatura por e-mail: {result.contactEmail}
                </a>
              )}
            </div>
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

          {/* Projetos da biblioteca relevantes para esta vaga (Biblioteca v5.0) */}
          {relevant.length > 0 && (
            <div className="la-section la-projects">
              <div className="la-section-title">Projetos seus relevantes para esta vaga</div>
              <div className="la-proj-list">
                {relevant.map(({ project, score, matched }) => {
                  const mt = matchTier(score);
                  return (
                    <div key={project.id} className="la-proj-item">
                      <div className="la-proj-head">
                        <span className="la-proj-title">{project.title}</span>
                        <span className="la-proj-match" style={{ color: mt.color, borderColor: mt.color }}>{score}% match</span>
                      </div>
                      {matched.length > 0 && (
                        <div className="la-proj-chips">
                          {matched.slice(0, 5).map((s) => <span key={s} className="la-proj-chip">{s}</span>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="la-proj-hint">Estes projetos serão incluídos ao gerar o CV para esta vaga.</p>
            </div>
          )}

          <div className="la-actions">
            {hasProfile ? (
              <button className="search-btn" onClick={handleGenerateCv}>
                gerar CV otimizado para esta vaga
              </button>
            ) : (
              <p className="la-profile-warn">
                Importe seu LinkedIn ou conecte seu GitHub para gerar o CV otimizado.
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
