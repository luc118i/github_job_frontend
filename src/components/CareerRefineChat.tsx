import { useEffect, useRef, useState } from 'react';
import { CareerChatMessage, CareerProfile, LinkedInData } from '../types';
import { sendCareerRefinement } from '../services/career';

interface Props {
  profile: CareerProfile;
  linkedIn: LinkedInData | null;
  onConfirm: (updated: CareerProfile) => void;
  onClose: () => void;
}

// Compute a list of human-readable changes between two profiles
function buildChangeSummary(oldP: CareerProfile, newP: CareerProfile): string[] {
  const changes: string[] = [];

  if (oldP.careerGoals !== newP.careerGoals)
    changes.push(`objetivo: ${newP.careerGoals}`);

  const oldAreas = [...oldP.desiredAreas].sort().join('|');
  const newAreas = [...newP.desiredAreas].sort().join('|');
  if (oldAreas !== newAreas)
    changes.push(newP.desiredAreas.length
      ? `quer explorar: ${newP.desiredAreas.join(', ')}`
      : 'areas de interesse removidas');

  const oldBlocked = [...oldP.blockedAreas].sort().join('|');
  const newBlocked = [...newP.blockedAreas].sort().join('|');
  if (oldBlocked !== newBlocked)
    changes.push(newP.blockedAreas.length
      ? `nao quer mais: ${newP.blockedAreas.join(', ')}`
      : 'restricoes de area removidas');

  if (oldP.transitionReady !== newP.transitionReady || oldP.transitionTarget !== newP.transitionTarget) {
    if (newP.transitionReady && newP.transitionTarget)
      changes.push(`transicao para: ${newP.transitionTarget}`);
    else if (!newP.transitionReady)
      changes.push('transicao de carreira desativada');
  }

  const oldStyle = [...oldP.workStyle].sort().join('|');
  const newStyle = [...newP.workStyle].sort().join('|');
  if (oldStyle !== newStyle)
    changes.push(`estilo de trabalho: ${newP.workStyle.join(', ')}`);

  if (oldP.leadershipLevel !== newP.leadershipLevel)
    changes.push(`lideranca: ${newP.leadershipLevel}`);

  if (oldP.techLiteracy !== newP.techLiteracy)
    changes.push(`tecnologia: ${newP.techLiteracy}`);

  const oldHidden = [...oldP.hiddenSkills].sort().join('|');
  const newHidden = [...newP.hiddenSkills].sort().join('|');
  if (oldHidden !== newHidden && newP.hiddenSkills.length)
    changes.push(`habilidades ocultas: ${newP.hiddenSkills.join(', ')}`);

  return changes;
}

export function CareerRefineChat({ profile, linkedIn, onConfirm, onClose }: Props) {
  const [messages, setMessages] = useState<CareerChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  // Starts true — immediately fetches AI's opening message
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Pending profile to confirm, plus the working profile that evolves during "continue"
  const [pendingProfile, setPendingProfile] = useState<CareerProfile | null>(null);
  const [workingProfile, setWorkingProfile] = useState<CareerProfile>(profile);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch AI opening message on mount
  useEffect(() => {
    async function fetchOpening() {
      try {
        const response = await sendCareerRefinement(workingProfile, [], linkedIn);
        if (response.message) {
          setMessages([{ role: 'assistant', content: response.message }]);
        }
        setOptions(response.options ?? []);
        if (response.done && response.profile) {
          setPendingProfile({ ...response.profile, completedAt: new Date().toISOString() });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao iniciar conversa');
      } finally {
        setLoading(false);
      }
    }
    fetchOpening();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, pendingProfile]);

  useEffect(() => {
    if (!loading && !pendingProfile) inputRef.current?.focus();
  }, [loading, pendingProfile]);

  async function handleSend(override?: string) {
    const text = (override ?? input).trim();
    if (!text || loading) return;

    if (!override) setInput('');
    setOptions([]);

    const userMsg: CareerChatMessage = { role: 'user', content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);
    setError('');

    try {
      const response = await sendCareerRefinement(workingProfile, updated, linkedIn);

      if (response.done && response.profile) {
        setPendingProfile({ ...response.profile, completedAt: new Date().toISOString() });
        setLoading(false);
        return;
      }

      if (response.message) {
        setMessages((prev) => [...prev, { role: 'assistant', content: response.message! }]);
      }
      setOptions(response.options ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleConfirm() {
    if (pendingProfile) onConfirm(pendingProfile);
  }

  function handleContinue() {
    if (!pendingProfile) return;
    setWorkingProfile(pendingProfile);
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: 'Perfil atualizado. Quer ajustar mais alguma coisa?' },
    ]);
    setPendingProfile(null);
    setOptions([]);
  }

  const changes = pendingProfile ? buildChangeSummary(workingProfile, pendingProfile) : [];

  return (
    <div className="crc-shell">

      {/* Header */}
      <div className="crc-header">
        <div className="crc-header-left">
          <div className="crc-avatar">IA</div>
          <div>
            <div className="crc-header-title">Refinamento de Perfil</div>
            <div className="crc-header-sub">ajuste continuo</div>
          </div>
        </div>
        <button className="crc-close-btn" onClick={onClose}>fechar</button>
      </div>

      {/* Messages */}
      <div className="crc-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`crc-msg crc-msg--${msg.role}`}>
            {msg.role === 'assistant' && <div className="crc-msg-icon">IA</div>}
            <div className="crc-bubble">{msg.content}</div>
          </div>
        ))}

        {loading && (
          <div className="crc-msg crc-msg--assistant">
            <div className="crc-msg-icon">IA</div>
            <div className="crc-bubble crc-bubble--typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        {/* Confirmation panel */}
        {pendingProfile && !loading && (
          <div className="crc-confirm-panel">
            <div className="crc-confirm-heading">perfil revisado</div>
            <p className="crc-confirm-summary">{pendingProfile.personalitySummary}</p>
            {pendingProfile.potentialSummary && (
              <p className="crc-confirm-potential">{pendingProfile.potentialSummary}</p>
            )}
            {changes.length > 0 && (
              <div className="crc-changes">
                <span className="crc-changes-label">alteracoes detectadas</span>
                <ul className="crc-changes-list">
                  {changes.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
            <div className="crc-confirm-actions">
              <button className="crc-confirm-btn" onClick={handleConfirm}>
                Confirmar atualizacao
              </button>
              <button className="crc-continue-btn" onClick={handleContinue}>
                Continuar ajustando
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && <div className="crc-error">{error}</div>}

      {/* Input */}
      {!pendingProfile && (
        <>
          {options.length > 0 && !loading && (
            <div className="crc-options">
              {options.map((opt) => (
                <button key={opt} className="crc-option-chip" onClick={() => handleSend(opt)}>
                  {opt}
                </button>
              ))}
            </div>
          )}
          <div className="crc-input-row">
            <textarea
              ref={inputRef}
              className="crc-input"
              placeholder="Digite sua resposta..."
              value={input}
              rows={1}
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="crc-send-btn"
              disabled={!input.trim() || loading}
              onClick={() => handleSend()}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 8L2 2l2 6-2 6 12-6z" fill="currentColor" />
              </svg>
            </button>
          </div>
          <div className="crc-footer-hint">Enter para enviar · Shift+Enter para nova linha</div>
        </>
      )}
    </div>
  );
}
