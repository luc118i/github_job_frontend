import { useEffect, useRef, useState } from 'react';
import {
  InterviewJob,
  InterviewCandidate,
  InterviewQuestion,
  InterviewChatTurn,
} from '../types';
import { generatePrep, savePrep, fetchPrep, simulateInterview } from '../services/interview';

interface InterviewStudioProps {
  jobId: string;
  job: InterviewJob;
  candidate: InterviewCandidate;
  onClose: () => void;
}

type Tab = 'prep' | 'sim';

const CAT_LABEL: Record<InterviewQuestion['category'], string> = {
  tecnica: 'Técnica',
  comportamental: 'Comportamental',
};

export function InterviewStudio({ jobId, job, candidate, onClose }: InterviewStudioProps) {
  const [tab, setTab] = useState<Tab>('prep');
  const [error, setError] = useState('');

  // ── Preparação ──────────────────────────────────────────────────
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [recruiterQs, setRecruiterQs] = useState<string[]>([]);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loadingPrep, setLoadingPrep] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const hasPrep = questions.length > 0;

  // ── Simulação ───────────────────────────────────────────────────
  const [history, setHistory] = useState<InterviewChatTurn[]>([]);
  const [answer, setAnswer] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Carrega a preparação salva (se houver) ao abrir.
  useEffect(() => {
    let alive = true;
    fetchPrep(jobId)
      .then((prep) => {
        if (!alive || !prep) return;
        setQuestions(prep.questions);
        setRecruiterQs(prep.recruiterQuestions);
      })
      .catch((e) => alive && setError((e as Error).message))
      .finally(() => alive && setLoadingPrep(false));
    return () => { alive = false; };
  }, [jobId]);

  // Auto-scroll do chat ao chegar nova mensagem.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, simLoading]);

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    setSaved(false);
    try {
      const draft = await generatePrep({ job, candidate });
      setQuestions(draft.questions);
      setRecruiterQs(draft.recruiterQuestions);
      setOpenIdx(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await savePrep({ job_id: jobId, questions, recruiterQuestions: recruiterQs });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function sendTurn(candidateTurn?: string) {
    // candidateTurn ausente = início da entrevista (IA faz a 1ª pergunta).
    const nextHistory: InterviewChatTurn[] = candidateTurn
      ? [...history, { role: 'candidate', content: candidateTurn }]
      : history;
    setHistory(nextHistory);
    setAnswer('');
    setSimLoading(true);
    setError('');
    try {
      const reply = await simulateInterview({ job, candidate, history: nextHistory });
      setHistory((h) => [...h, { role: 'interviewer', content: reply }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSimLoading(false);
    }
  }

  function handleSend() {
    const text = answer.trim();
    if (!text || simLoading) return;
    sendTurn(text);
  }

  return (
    <div className="cv-versions-overlay" onClick={onClose}>
      <aside className="cv-lib-panel iv-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cv-versions-head">
          <span className="cv-versions-title">Interview Studio</span>
          <button className="cv-versions-close" onClick={onClose}>fechar</button>
        </div>

        <p className="cv-lib-sub">
          Preparação para <strong>{job.title}</strong> @ {job.company}.
        </p>

        {/* Abas */}
        <div className="iv-tabs">
          <button className={`iv-tab${tab === 'prep' ? ' iv-tab--active' : ''}`} onClick={() => setTab('prep')}>
            Preparação
          </button>
          <button className={`iv-tab${tab === 'sim' ? ' iv-tab--active' : ''}`} onClick={() => setTab('sim')}>
            Simulação
          </button>
        </div>

        {error && <div className="cv-lib-error" onClick={() => setError('')}>{error}</div>}

        {/* ── Aba Preparação ── */}
        {tab === 'prep' && (
          <div className="iv-body">
            {loadingPrep ? (
              <div className="cv-versions-empty">carregando…</div>
            ) : (
              <>
                <div className="iv-prep-actions">
                  <button className="cv-lib-ai-btn" onClick={handleGenerate} disabled={generating}>
                    {generating ? 'gerando preparação…' : hasPrep ? '↻ regenerar com IA' : 'gerar preparação com IA'}
                  </button>
                  {hasPrep && (
                    <button className="iv-save-btn" onClick={handleSave} disabled={saving}>
                      {saving ? 'salvando…' : saved ? '✓ salvo' : 'salvar'}
                    </button>
                  )}
                </div>

                {!hasPrep && !generating && (
                  <p className="iv-hint">
                    A IA gera as perguntas mais prováveis (técnicas e comportamentais) com respostas
                    sugeridas no método STAR baseadas no seu perfil, além de perguntas para você fazer ao recrutador.
                  </p>
                )}

                {/* Perguntas prováveis */}
                {questions.map((q, i) => (
                  <div key={i} className={`iv-q${openIdx === i ? ' iv-q--open' : ''}`}>
                    <button className="iv-q-head" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                      <span className="iv-q-main">
                        <span className={`iv-q-cat iv-q-cat--${q.category}`}>{CAT_LABEL[q.category]}</span>
                        <span className="iv-q-text">{q.question}</span>
                      </span>
                      <span className="iv-q-chev">{openIdx === i ? '−' : '+'}</span>
                    </button>
                    {openIdx === i && q.suggestedAnswer && (
                      <div className="iv-q-answer">
                        <span className="iv-q-answer-label">Resposta sugerida (STAR)</span>
                        {q.suggestedAnswer}
                      </div>
                    )}
                  </div>
                ))}

                {/* Perguntas para o recrutador */}
                {recruiterQs.length > 0 && (
                  <div className="iv-recruiter">
                    <h4 className="iv-recruiter-title">Perguntas para fazer ao recrutador</h4>
                    <ul className="iv-recruiter-list">
                      {recruiterQs.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Aba Simulação ── */}
        {tab === 'sim' && (
          <div className="iv-body iv-sim">
            <div className="iv-chat">
              {history.length === 0 && !simLoading && (
                <div className="iv-sim-start">
                  <p className="iv-hint">
                    Simule uma entrevista real: o entrevistador faz uma pergunta por vez e dá feedback das suas respostas.
                  </p>
                  <button className="cv-lib-ai-btn" onClick={() => sendTurn()}>▶ iniciar simulação</button>
                </div>
              )}
              {history.map((t, i) => (
                <div key={i} className={`iv-msg iv-msg--${t.role}`}>
                  <span className="iv-msg-who">{t.role === 'interviewer' ? 'Entrevistador' : 'Você'}</span>
                  <p className="iv-msg-text">{t.content}</p>
                </div>
              ))}
              {simLoading && <div className="iv-msg iv-msg--interviewer"><span className="iv-typing">digitando…</span></div>}
              <div ref={chatEndRef} />
            </div>

            {history.length > 0 && (
              <div className="iv-input-row">
                <textarea
                  className="iv-input"
                  placeholder="sua resposta…"
                  value={answer}
                  rows={2}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  disabled={simLoading}
                />
                <button className="iv-send-btn" onClick={handleSend} disabled={simLoading || !answer.trim()}>
                  enviar
                </button>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
