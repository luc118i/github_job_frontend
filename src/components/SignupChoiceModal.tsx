import { useRef, useState } from 'react';
import { LinkedInData } from '../types';
import { importLinkedIn } from '../services/linkedin';

interface Props {
  open: boolean;
  onClose: () => void;
  onLinkedInImported: (data: LinkedInData) => void;
  onManualChosen: () => void;
}

export function SignupChoiceModal({ open, onClose, onLinkedInImported, onManualChosen }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const result = await importLinkedIn(file);
      onLinkedInImported(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal mrw-choice-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-header">
          <span className="auth-title">criar conta</span>
          <button className="auth-close" onClick={onClose}>×</button>
        </div>

        <div className="mrw-choice-body">
          <p className="onb-subtitle mrw-choice-intro">Como você quer montar seu currículo?</p>

          <button
            className="mrw-choice-card"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
          >
            <span className="mrw-choice-card-title">{loading ? 'Processando...' : 'Importar do LinkedIn'}</span>
            <span className="mrw-choice-card-sub">Envie o PDF do seu perfil ou o .zip de exportação de dados</span>
          </button>
          <input ref={inputRef} type="file" accept=".pdf,.zip" style={{ display: 'none' }} onChange={handleFile} />

          <button className="mrw-choice-card" onClick={onManualChosen}>
            <span className="mrw-choice-card-title">Criar currículo manualmente</span>
            <span className="mrw-choice-card-sub">Não tem LinkedIn ou prefere preencher você mesmo — leva poucos minutos</span>
          </button>

          {error && <span className="auth-error">{error}</span>}
        </div>
      </div>
    </div>
  );
}
