import { useState, useRef, useEffect } from 'react';

interface Props {
  username: string | null;
  onChange: (username: string | null) => void;
}

const IconGithub = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export function GithubConnect({ username, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(username ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function handleSave() {
    const v = input.trim().replace(/^@/, '').replace(/\s/g, '');
    onChange(v || null);
    setOpen(false);
  }

  function handleClear() {
    setInput('');
    onChange(null);
    setOpen(false);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
    if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className="github-connect">
      <button
        className={`prefs-card-toggle github-connect-toggle${open ? ' open' : ''}${username ? ' has-prefs' : ''}`}
        onClick={() => { setOpen(!open); if (!open) setInput(username ?? ''); }}
        type="button"
      >
        <div className="prefs-card-icon github-connect-icon">
          <IconGithub />
        </div>
        <span className="prefs-card-title">
          {username ? username : 'GitHub'}
        </span>
        <span className="prefs-card-sub">
          {username ? 'repositorios vinculados a busca' : 'vincule para personalizar com seus projetos'}
        </span>
      </button>

      {open && (
        <div className="github-connect-body">
          <div className="github-connect-input-row">
            <span className="github-connect-prefix">github.com/</span>
            <input
              ref={inputRef}
              className="github-connect-input"
              type="text"
              placeholder="seu-usuario"
              value={input}
              onChange={e => setInput(e.target.value.replace(/^@/, '').replace(/\s/g, ''))}
              onKeyDown={handleKey}
              maxLength={40}
            />
          </div>
          <div className="github-connect-actions">
            <button
              className="github-connect-save"
              onClick={handleSave}
              disabled={!input.trim()}
            >
              vincular
            </button>
            {username && (
              <button className="github-connect-clear" onClick={handleClear}>
                desvincular
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
