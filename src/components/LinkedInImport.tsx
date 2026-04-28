import { useRef, useState } from 'react';
import { LinkedInData } from '../types';
import { importLinkedIn } from '../services/linkedin';

interface LinkedInImportProps {
  data: LinkedInData | null;
  onImport: (data: LinkedInData) => void;
  onClear: () => void;
}

export function LinkedInImport({ data, onImport, onClear }: LinkedInImportProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const result = await importLinkedIn(file);
      onImport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  if (data) {
    const pos = data.positions.length;
    const edu = data.education.length;
    return (
      <div className="li-import-done">
        <span className="li-import-check">✓</span>
        <span className="li-import-summary">
          {data.name ? `${data.name} — ` : 'LinkedIn importado — '}
          {pos} experiência{pos !== 1 ? 's' : ''}, {edu} formação{edu !== 1 ? 'ões' : ''}
        </span>
        <button className="li-import-clear" onClick={onClear} title="Remover">✕</button>
      </div>
    );
  }

  return (
    <div className="li-import">
      <button
        className={`li-import-btn${loading ? ' loading' : ''}`}
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? 'Processando...' : '↑ Importar LinkedIn (.pdf ou .zip)'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.zip"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      {error ? (
        <span className="li-import-error">{error}</span>
      ) : (
        <span className="li-import-hint">
          PDF: perfil → Mais → Salvar como PDF &nbsp;·&nbsp; ZIP: Config → Privacidade → Obter cópia dos dados
        </span>
      )}
    </div>
  );
}
