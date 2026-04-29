import { useRef, useState, useEffect } from 'react';
import { LinkedInData } from '../types';
import { importLinkedIn } from '../services/linkedin';
import { LinkedInTutorialModal, useTutorialAutoOpen } from './LinkedInTutorialModal';

interface LinkedInImportProps {
  data: LinkedInData | null;
  onImport: (data: LinkedInData) => void;
  onClear: () => void;
}

export function LinkedInImport({ data, onImport, onClear }: LinkedInImportProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldAutoOpen = useTutorialAutoOpen();

  useEffect(() => {
    if (shouldAutoOpen) setTutorialOpen(true);
  }, [shouldAutoOpen]);

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
        <span className="li-import-check" />
        <span className="li-import-summary">
          {data.name ? `${data.name} — ` : 'LinkedIn importado — '}
          {pos} experiência{pos !== 1 ? 's' : ''}, {edu} formação{edu !== 1 ? 'ões' : ''}
        </span>
        <button className="li-import-clear" onClick={onClear} title="Remover">×</button>
      </div>
    );
  }

  return (
    <>
      <LinkedInTutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      <div className="li-import">
        <div className="li-import-row">
          <button
            className={`li-import-btn${loading ? ' loading' : ''}`}
            onClick={() => inputRef.current?.click()}
            disabled={loading}
          >
            {loading ? 'Processando...' : 'Importar LinkedIn (.pdf)'}
          </button>
          <button
            className="li-tutorial-trigger"
            onClick={() => setTutorialOpen(true)}
            title="Como baixar o arquivo"
          >
            como baixar?
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.zip"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
        {error && <span className="li-import-error">{error}</span>}
      </div>
    </>
  );
}
