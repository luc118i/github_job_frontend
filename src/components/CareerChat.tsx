import { useEffect, useRef, useState } from 'react';
import { CareerChatMessage, CareerProfile, LinkedInData } from '../types';
import { sendCareerMessage } from '../services/career';

interface Props {
  linkedIn?: LinkedInData | null;
  onComplete: (profile: CareerProfile) => void;
  onClose?: () => void;
}

// Primeira mensagem genérica — quando temos LinkedIn, o backend irá personalizar
// automaticamente. O usuário não vê diferença; o contexto entra no system prompt.
const OPENING_MESSAGE: CareerChatMessage = {
  role: 'assistant',
  content: 'Olá! Vou te fazer algumas perguntas para entender seu perfil de carreira.',
};

export function CareerChat({ linkedIn, onComplete, onClose }: Props) {
  const [messages, setMessages] = useState<CareerChatMessage[]>([OPENING_MESSAGE]);
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [loading]);

  async function handleSend(override?: string) {
    const text = (override ?? input).trim();
    if (!text || loading) return;

    if (!override) setInput('');
    setOptions([]);

    const userMessage: CareerChatMessage = { role: 'user', content: text };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setLoading(true);
    setError('');

    try {
      const response = await sendCareerMessage(updated, linkedIn);

      if (response.done && response.profile) {
        const profile: CareerProfile = {
          ...response.profile,
          completedAt: new Date().toISOString(),
        };
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Perfil concluído. Agora vou buscar vagas alinhadas com quem você realmente é.' },
        ]);
        setTimeout(() => onComplete(profile), 1600);
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

  const userMessageCount = messages.filter((m) => m.role === 'user').length;
  const progress = Math.min(userMessageCount / 7, 1);

  return (
    <div className="cc-shell">
      {/* Header */}
      <div className="cc-header">
        <div className="cc-header-left">
          <div className="cc-avatar">IA</div>
          <div>
            <div className="cc-header-title">Consultor de Carreira</div>
            <div className="cc-header-sub">analise de potencial</div>
          </div>
        </div>
        <div className="cc-header-right">
          <div className="cc-progress-wrap">
            <div className="cc-progress-bar">
              <div className="cc-progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <span className="cc-progress-label">{Math.round(progress * 100)}%</span>
          </div>
          {onClose && (
            <button className="cc-close-btn" onClick={onClose}>sair</button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="cc-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`cc-msg cc-msg--${msg.role}`}>
            {msg.role === 'assistant' && <div className="cc-msg-icon">IA</div>}
            <div className="cc-bubble">{msg.content}</div>
          </div>
        ))}

        {loading && (
          <div className="cc-msg cc-msg--assistant">
            <div className="cc-msg-icon">IA</div>
            <div className="cc-bubble cc-bubble--typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && <div className="cc-error">{error}</div>}

      {/* Quick-reply options */}
      {options.length > 0 && !loading && (
        <div className="cc-options">
          {options.map((opt) => (
            <button key={opt} className="cc-option-chip" onClick={() => handleSend(opt)}>
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="cc-input-row">
        <textarea
          ref={inputRef}
          className="cc-input"
          placeholder="Digite sua resposta..."
          value={input}
          rows={1}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className="cc-send-btn"
          disabled={!input.trim() || loading}
          onClick={() => handleSend()}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 8L2 2l2 6-2 6 12-6z" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div className="cc-footer-hint">
        Enter para enviar  ·  Shift+Enter para nova linha
      </div>
    </div>
  );
}
