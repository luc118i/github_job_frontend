import { useState } from 'react';
import { LinkedInData } from '../types';
import { importResumeText } from '../services/linkedin';

interface Props {
  onImported: (data: LinkedInData) => void;
  cardClassName?: string;
  triggerClassName?: string;
}

/** Card expansível para colar o texto de um currículo (qualquer formato) e extrair os dados via IA. */
export function ResumeTextPaste({ onImported, cardClassName = 'mrw-choice-card', triggerClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await importResumeText(text);
      onImported(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar texto');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button className={triggerClassName ?? cardClassName} onClick={() => setOpen(true)}>
        <span className="mrw-choice-card-title">Colar currículo (texto)</span>
        <span className="mrw-choice-card-sub">Tem um currículo em outro formato? Cole o texto e a gente organiza pra você</span>
      </button>
    );
  }

  return (
    <div className={`${cardClassName} mrw-choice-paste`}>
      <span className="mrw-choice-card-title">Colar currículo</span>
      <textarea
        className="mrw-choice-paste-input"
        placeholder="Cole aqui o texto do seu currículo (qualquer formato)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        disabled={loading}
      />
      <div className="mrw-choice-paste-actions">
        <button
          className="mrw-choice-paste-cancel"
          onClick={() => { setOpen(false); setText(''); setError(''); }}
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          className="mrw-choice-paste-submit"
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
        >
          {loading ? 'Processando...' : 'Enviar'}
        </button>
      </div>
      {error && <span className="auth-error">{error}</span>}
    </div>
  );
}
