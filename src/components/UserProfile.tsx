import { useEffect, useState } from 'react';
import { AuthUser, updateProfile } from '../services/auth';
import { LinkedInData } from '../types';

interface UserProfileProps {
  user: AuthUser;
  linkedInData: LinkedInData | null;
  onUpdate: (user: AuthUser) => void;
}

export function UserProfile({ user, linkedInData, onUpdate }: UserProfileProps) {
  const [name, setName] = useState(user.name ?? '');
  const [github, setGithub] = useState(user.github_username ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(user.name ?? '');
    setGithub(user.github_username ?? '');
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const updated = await updateProfile({
        name: name.trim() || null,
        github_username: github.trim() || null,
      });
      onUpdate(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="user-profile">
      <div className="user-profile-header">
        <span className="user-profile-title">perfil</span>
      </div>

      <div className="user-profile-body">
        <form className="user-profile-form" onSubmit={handleSave}>
          <div className="user-profile-section-label">conta</div>

          <div className="user-profile-field">
            <label className="user-profile-label">nome</label>
            <input
              className="user-profile-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="seu nome"
            />
          </div>

          <div className="user-profile-field">
            <label className="user-profile-label">e-mail</label>
            <input
              className="user-profile-input user-profile-input--readonly"
              type="email"
              value={user.email}
              readOnly
            />
            <span className="user-profile-hint">o e-mail não pode ser alterado</span>
          </div>

          <div className="user-profile-section-label" style={{ marginTop: 28 }}>github</div>

          <div className="user-profile-field">
            <label className="user-profile-label">usuário</label>
            <div className="user-profile-github-row">
              <span className="user-profile-github-prefix">github.com/</span>
              <input
                className="user-profile-input user-profile-input--github"
                type="text"
                value={github}
                onChange={e => setGithub(e.target.value.replace(/^@/, '').replace(/\s/g, ''))}
                placeholder="seu-usuario"
              />
            </div>
            {github.trim() && (
              <a
                className="user-profile-github-link"
                href={`https://github.com/${github.trim()}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                verificar perfil no github
              </a>
            )}
            <span className="user-profile-hint">
              vinculado à busca na aba "vagas TI" — preenche o campo automaticamente
            </span>
          </div>

          {error && <span className="user-profile-error">{error}</span>}
          {success && <span className="user-profile-success">salvo com sucesso</span>}

          <button className="user-profile-save-btn" type="submit" disabled={saving}>
            {saving ? 'salvando...' : 'salvar alterações'}
          </button>
        </form>

        {linkedInData && (
          <div className="user-profile-linkedin">
            <div className="user-profile-section-label">linkedin importado</div>
            <div className="user-profile-linkedin-info">
              <span className="user-profile-linkedin-name">{linkedInData.name ?? '—'}</span>
              <span className="user-profile-linkedin-sub">
                {linkedInData.positions.length} experiência{linkedInData.positions.length !== 1 ? 's' : ''} &middot;{' '}
                {linkedInData.education.length} formação{linkedInData.education.length !== 1 ? 'es' : ''}
              </span>
              <span className="user-profile-hint">para atualizar, reimporte o PDF do LinkedIn</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
