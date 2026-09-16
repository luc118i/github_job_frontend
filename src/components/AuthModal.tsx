import { useEffect, useState } from 'react';
import { LinkedInData } from '../types';
import { register, login, saveToken, checkEmailExists, requestPasswordReset, resetPassword, AuthUser } from '../services/auth';

type Mode = 'register' | 'login' | 'forgot' | 'reset';

interface AuthModalProps {
  open: boolean;
  linkedInData: LinkedInData | null;
  onSuccess: (user: AuthUser, linkedInData?: LinkedInData) => void;
  onClose: () => void;
  reason?: string;
  /** Presente quando o modal foi aberto a partir de um link de redefinição de senha (?reset=token). */
  resetToken?: string | null;
  /** Chamado ao clicar "criar conta" sem currículo pronto — abre a tela de escolha (LinkedIn/manual). */
  onNeedsResume?: () => void;
}

export function AuthModal({ open, linkedInData, onSuccess, onClose, reason, resetToken, onNeedsResume }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(linkedInData ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!open) return;
    setMode(resetToken ? 'reset' : linkedInData ? 'register' : 'login');
    setEmail(linkedInData?.email ?? '');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError('');
    setSuccess('');
  }, [open, linkedInData, resetToken]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Verifica se o e-mail já tem conta e sugere o modo certo (login vs. criar conta) —
  // evita o usuário cair em "senha incorreta" quando na verdade não tem conta ainda.
  async function handleEmailBlur() {
    if (mode !== 'login' && mode !== 'register') return;
    if (!email || !email.includes('@')) return;
    try {
      const exists = await checkEmailExists(email);
      if (mode === 'login' && !exists) {
        setError('Não encontramos conta com esse e-mail. Você pode criar uma abaixo.');
      } else if (mode === 'register' && exists && linkedInData) {
        setError('Este e-mail já tem conta — mude para "entrar".');
      } else {
        setError('');
      }
    } catch {
      // checagem é best-effort — falha silenciosa não deve travar o formulário
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'register') {
        if (!linkedInData) { setError('Importe o LinkedIn antes de criar a conta.'); return; }
        const result = await register(email, password, linkedInData);
        saveToken(result.token);
        onSuccess(result.user);
      } else if (mode === 'login') {
        const result = await login(email, password);
        saveToken(result.token);
        onSuccess(result.user, result.linkedInData);
      } else if (mode === 'forgot') {
        await requestPasswordReset(email);
        setSuccess('Se esse e-mail tiver conta, enviamos um link de redefinição. Confira sua caixa de entrada.');
      } else if (mode === 'reset') {
        if (password.length < 6) { setError('A senha precisa ter pelo menos 6 caracteres.'); return; }
        if (password !== confirmPassword) { setError('As senhas não coincidem.'); return; }
        await resetPassword(resetToken!, password);
        setSuccess('Senha redefinida com sucesso! Você já pode entrar com a nova senha.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const titles: Record<Mode, string> = {
    register: 'criar conta',
    login: 'entrar',
    forgot: 'recuperar senha',
    reset: 'nova senha',
  };

  const submitLabels: Record<Mode, string> = {
    register: 'criar conta',
    login: 'entrar',
    forgot: 'enviar link',
    reset: 'redefinir senha',
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <div className="auth-header">
          <span className="auth-title">{titles[mode]}</span>
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
          {mode !== 'reset' && (
            <div className="auth-field">
              <label className="auth-label">e-mail</label>
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="seu@email.com"
                required
                autoFocus={!email}
              />
            </div>
          )}

          {(mode === 'register' || mode === 'login' || mode === 'reset') && (
            <div className="auth-field">
              <label className="auth-label">{mode === 'reset' ? 'nova senha' : 'senha'}</label>
              <div className="auth-password-wrap">
                <input
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'login' ? '••••••••' : 'mínimo 6 caracteres'}
                  required
                  autoFocus={mode === 'reset' || !!email}
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
              {mode === 'login' && (
                <button
                  type="button"
                  className="auth-forgot-link"
                  onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                >
                  esqueci minha senha
                </button>
              )}
            </div>
          )}

          {mode === 'reset' && (
            <div className="auth-field">
              <label className="auth-label">confirmar nova senha</label>
              <input
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="repita a nova senha"
                required
              />
            </div>
          )}

          {error && <span className="auth-error">{error}</span>}
          {success && <span className="auth-success">{success}</span>}

          <button className="auth-submit btn-tag" type="submit" disabled={loading}>
            {loading ? 'aguarde...' : submitLabels[mode]}
          </button>
        </form>

        {mode === 'forgot' && (
          <div className="auth-switch">
            <button
              className="auth-switch-btn"
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
            >
              voltar para entrar
            </button>
          </div>
        )}

        {mode === 'register' && (
          <div className="auth-switch">
            Já tem conta?{' '}
            <button className="auth-switch-btn" onClick={() => { setMode('login'); setError(''); }}>
              entrar
            </button>
          </div>
        )}

        {mode === 'login' && (
          <div className="auth-switch">
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
          </div>
        )}
      </div>
    </div>
  );
}
