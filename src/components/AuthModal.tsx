import { useEffect, useState } from 'react';
import { LinkedInData } from '../types';
import { register, login, saveToken, AuthUser } from '../services/auth';

type Mode = 'register' | 'login';

interface AuthModalProps {
  open: boolean;
  linkedInData: LinkedInData | null;
  onSuccess: (user: AuthUser, linkedInData?: LinkedInData) => void;
  onClose: () => void;
  reason?: string;
  /** Chamado ao clicar "criar conta" sem currículo pronto — abre a tela de escolha (LinkedIn/manual). */
  onNeedsResume?: () => void;
}

export function AuthModal({ open, linkedInData, onSuccess, onClose, reason, onNeedsResume }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(linkedInData ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setMode(linkedInData ? 'register' : 'login');
    setEmail(linkedInData?.email ?? '');
    setPassword('');
    setShowPassword(false);
    setError('');
  }, [open, linkedInData]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        if (!linkedInData) { setError('Importe o LinkedIn antes de criar a conta.'); return; }
        const result = await register(email, password, linkedInData);
        saveToken(result.token);
        onSuccess(result.user);
      } else {
        const result = await login(email, password);
        saveToken(result.token);
        onSuccess(result.user, result.linkedInData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <div className="auth-header">
          <span className="auth-title">
            {mode === 'register' ? 'criar conta' : 'entrar'}
          </span>
          <button className="auth-close" onClick={onClose}>×</button>
        </div>

        {reason && (
          <div className="auth-reason">{reason}</div>
        )}

        {mode === 'register' && linkedInData && (
          <div className="auth-profile-preview">
            <span className="auth-profile-name">{linkedInData.name ?? 'Seu perfil'}</span>
            <span className="auth-profile-sub">
              {linkedInData.positions.length} experiência{linkedInData.positions.length !== 1 ? 's' : ''} no currículo
            </span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">e-mail</label>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoFocus={!email}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">senha</label>
            <div className="auth-password-wrap">
              <input
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'mínimo 6 caracteres' : '••••••••'}
                required
                autoFocus={!!email}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M2 9c1.5-3 4.2-5 7-5s5.5 2 7 5c-1.5 3-4.2 5-7 5s-5.5-2-7-5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.4"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M2 9c1.5-3 4.2-5 7-5s5.5 2 7 5c-1.5 3-4.2 5-7 5s-5.5-2-7-5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M2.5 15.5L15.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <span className="auth-error">{error}</span>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'aguarde...' : mode === 'register' ? 'criar conta' : 'entrar'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'register' ? (
            <>
              Já tem conta?{' '}
              <button className="auth-switch-btn" onClick={() => { setMode('login'); setError(''); }}>
                entrar
              </button>
            </>
          ) : (
            <>
              Não tem conta?{' '}
              <button
                className="auth-switch-btn"
                onClick={() => {
                  if (!linkedInData && onNeedsResume) { onNeedsResume(); return; }
                  setMode('register');
                  setError('');
                }}
              >
                criar conta
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
