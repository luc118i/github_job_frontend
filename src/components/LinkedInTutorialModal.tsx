import { useEffect } from 'react';

const STORAGE_KEY = 'li_tutorial_seen';

interface Props {
  open: boolean;
  onClose: () => void;
}

const steps = [
  {
    n: '1',
    title: 'Acesse seu perfil',
    desc: 'Entre no LinkedIn e clique no seu nome ou foto para abrir o perfil.',
  },
  {
    n: '2',
    title: 'Abra o menu "Mais"',
    desc: 'Abaixo da sua foto e nome, clique no botão "Mais".',
  },
  {
    n: '3',
    title: 'Salvar como PDF',
    desc: 'No menu que abrir, selecione "Salvar como PDF". O download começa automaticamente.',
  },
  {
    n: '4',
    title: 'Importe aqui',
    desc: 'Volte para cá e clique em "Importar LinkedIn" para enviar o arquivo baixado.',
  },
];

export function LinkedInTutorialModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, '1');
    onClose();
  }

  if (!open) return null;

  return (
    <div className="li-tutorial-overlay" onClick={handleClose}>
      <div className="li-tutorial-modal" onClick={e => e.stopPropagation()}>
        <div className="li-tutorial-header">
          <span className="li-tutorial-title">como baixar seu perfil do LinkedIn</span>
          <button className="li-tutorial-close" onClick={handleClose}>×</button>
        </div>

        <div className="li-tutorial-steps">
          {steps.map(s => (
            <div key={s.n} className="li-tutorial-step">
              <div className="li-tutorial-num">{s.n}</div>
              <div className="li-tutorial-body">
                <div className="li-tutorial-step-title">{s.title}</div>
                <div className="li-tutorial-step-desc">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="li-tutorial-footer">
          <button className="li-tutorial-btn" onClick={handleClose}>entendido</button>
        </div>
      </div>
    </div>
  );
}

export function useTutorialAutoOpen() {
  return !localStorage.getItem(STORAGE_KEY);
}
