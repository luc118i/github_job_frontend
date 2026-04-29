import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { JobRecord, Profile, LinkedInData, CvRequest } from '../types';
import { generateCv, updateCv, CvApiError } from '../services/cv';
import { downloadCvPdf } from '../services/pdfExport';
import { dismissJob } from '../services/jobs';
import { markCvGenerated } from '../utils/dailyLimit';

interface CvEditorProps {
  job: JobRecord;
  profile: Profile;
  linkedIn: LinkedInData | null;
  onBack: () => void;
  onDismiss: (jobId: string) => void;
  onGoToHistory: () => void;
  initialCvId?: string;
  initialContent?: string;
}

type MobileTab = 'editor' | 'preview';

export function CvEditor({ job, profile, linkedIn, onBack, onDismiss, onGoToHistory, initialCvId, initialContent }: CvEditorProps) {
  const isViewMode = initialContent !== undefined;

  const [markdown, setMarkdown] = useState<string | null>(null);
  const [cvId, setCvId] = useState<string | null>(initialCvId ?? null);
  const [loading, setLoading] = useState(!isViewMode);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const totalCountdownRef = useRef<number>(0);
  const [mobileTab, setMobileTab] = useState<MobileTab>('preview');

  async function handleDismiss() {
    setDismissing(true);
    dismissJob(job.id).catch(console.error);
    onDismiss(job.id);
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onBack]);

  function buildRequest(): CvRequest {
    return {
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        level: job.level,
        remote: job.remote,
        skills: job.skills,
        description: job.description,
      },
      candidate: {
        name: linkedIn?.name ?? profile.user.name ?? profile.user.login,
        email: linkedIn?.email ?? null,
        phone: linkedIn?.phone ?? null,
        githubLogin: profile.user.login,
        githubBio: profile.user.bio,
        githubFollowers: profile.user.followers,
        githubPublicRepos: profile.user.public_repos,
        skills: profile.skills,
        repos: profile.repos,
        positions: linkedIn?.positions ?? [],
        education: linkedIn?.education ?? [],
      },
    };
  }

  function requestCv() {
    setLoading(true);
    setError('');
    setCountdown(null);
    setMarkdown(null);
    generateCv(buildRequest())
      .then((res) => {
        setMarkdown(res.content);
        setCvId(res.cvId);
        markCvGenerated(job.id);
      })
      .catch((e: Error) => {
        setError(e.message);
        if (e instanceof CvApiError && e.retryAfter) {
          totalCountdownRef.current = e.retryAfter;
          setCountdown(e.retryAfter);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (isViewMode) {
      setMarkdown(initialContent!);
    } else {
      requestCv();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!markdown || !cvId) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await updateCv(cvId, markdown);
      setSaveMsg('salvo');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch {
      setSaveMsg('erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    if (!markdown) return;
    setPdfLoading(true);
    try {
      await downloadCvPdf(markdown, job.title, job.company);
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="cv-page">
      <div className="cv-topbar">
        <button className="cv-back-btn" onClick={onBack}>Voltar</button>
        <span className="cv-topbar-title">
          {job.title}
          <span className="cv-topbar-company">@ {job.company}</span>
        </span>
        <div className="cv-topbar-actions">
          {markdown && !loading && cvId && (
            <button className="cv-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'salvando...' : saveMsg || 'salvar'}
            </button>
          )}
          {markdown && !loading && (
            <button
              className="cv-download-btn"
              disabled={pdfLoading}
              onClick={handleDownload}
            >
              {pdfLoading ? 'gerando...' : 'baixar PDF'}
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="cv-page-loading">
          <div className="loading-bar">
            <div className="loading-step">
              <div className="dot" />
              gerando curriculo com ia...
            </div>
            <div className="loading-step">
              <div className="dot" style={{ animationDelay: '0.3s' }} />
              otimizando para ats
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="cv-page-loading">
          <div className="cv-error-block">
            <span className="cv-error-msg">{error}</span>
            {countdown !== null && countdown > 0 && (
              <div className="cv-retry-countdown">
                <div
                  className="cv-retry-progress"
                  style={{ width: `${(countdown / totalCountdownRef.current) * 100}%` }}
                />
                <span className="cv-retry-timer">{countdown}s</span>
              </div>
            )}
            <div className="cv-error-actions">
              <button
                className="cv-back-btn"
                onClick={requestCv}
                disabled={countdown !== null && countdown > 0}
              >
                {countdown !== null && countdown > 0
                  ? `aguarde ${countdown}s...`
                  : 'tentar novamente'}
              </button>
              <button className="cv-back-btn" onClick={onBack}>voltar</button>
            </div>
          </div>
        </div>
      )}

      {markdown && !loading && (
        <>
          <div className="cv-mobile-tabs">
            <button
              className={`cv-mobile-tab ${mobileTab === 'preview' ? 'active' : ''}`}
              onClick={() => setMobileTab('preview')}
            >
              preview
            </button>
            <button
              className={`cv-mobile-tab ${mobileTab === 'editor' ? 'active' : ''}`}
              onClick={() => setMobileTab('editor')}
            >
              markdown
            </button>
          </div>

          <div className="cv-workspace">
            <div className={`cv-edit-pane ${mobileTab === 'editor' ? 'mobile-active' : ''}`}>
              <div className="cv-pane-label">markdown</div>
              <textarea
                className="cv-editor-textarea"
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                spellCheck={false}
              />
            </div>

            <div className={`cv-preview-pane ${mobileTab === 'preview' ? 'mobile-active' : ''}`}>
              <div className="cv-pane-label">preview</div>
              <div className="cv-paper-wrap">
                <div className="cv-paper">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="cvp-name">{children}</h1>,
                      h2: ({ children }) => <h2 className="cvp-section">{children}</h2>,
                      ul: ({ children }) => <ul className="cvp-list">{children}</ul>,
                      ol: ({ children }) => <ol className="cvp-list">{children}</ol>,
                      li: ({ children }) => <li className="cvp-bullet">{children}</li>,
                      p: ({ children }) => <p className="cvp-line">{children}</p>,
                      strong: ({ children }) => <strong className="cvp-bold">{children}</strong>,
                      a: ({ href, children }) => (
                        <a href={href} className="cvp-link" target="_blank" rel="noopener noreferrer">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {markdown}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>

          <div className="cv-job-bar">
            <span className="cv-job-bar-label">o que achou da vaga?</span>
            <div className="cv-job-bar-actions">
              {job.link && (
                <a
                  href={job.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cv-job-link-btn"
                >
                  Ver vaga
                </a>
              )}
              <button className="history-link-btn" onClick={onGoToHistory}>
                Ver historico
              </button>
              <button
                className="cv-dismiss-btn"
                disabled={dismissing}
                onClick={handleDismiss}
              >
                Nao tenho interesse
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
