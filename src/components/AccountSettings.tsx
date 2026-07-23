import { useEffect, useState } from 'react';
import { AuthUser, updateProfile, updateLinkedIn } from '../services/auth';
import { LinkedInData } from '../types';
import { ManualResumeWizard } from './ManualResumeWizard';

interface AccountSettingsProps {
  user: AuthUser;
  linkedInData: LinkedInData | null;
  onUpdate: (user: AuthUser) => void;
  onLinkedInUpdate: (data: LinkedInData) => void;
}

/**
 * Seção de Conta da área "Minha Carreira".
 * Edita nome e usuário do GitHub, mostra o e-mail (somente leitura) e
 * o resumo do currículo (importado do LinkedIn ou preenchido manualmente).
 * Extraído da antiga view "perfil".
 */
export function AccountSettings({ user, linkedInData, onUpdate, onLinkedInUpdate }: AccountSettingsProps) {
  const [name, setName] = useState(user.name ?? '');
  const [github, setGithub] = useState(user.github_username ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [editingResume, setEditingResume] = useState(false);

  async function handleResumeSave(data: LinkedInData) {
    try {
      await updateLinkedIn(data);
      onLinkedInUpdate(data);
      setEditingResume(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar currículo');
    }
  }

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
    <div className="user-profile-body">
      {/* ── Conta ── */}
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
          <span className="user-profile-hint">vinculado à busca na aba "vagas TI"</span>
        </div>

        {error && <span className="user-profile-error">{error}</span>}
        {success && <span className="user-profile-success">salvo com sucesso</span>}

        <button className="user-profile-save-btn" type="submit" disabled={saving}>
          {saving ? 'salvando...' : 'salvar alterações'}
        </button>
      </form>

      {/* ── Currículo (LinkedIn ou manual) ── */}
      {editingResume ? (
        <div className="user-profile-linkedin">
          <div className="user-profile-section-label">editar currículo</div>
          <ManualResumeWizard
            initial={linkedInData}
            onComplete={handleResumeSave}
            onCancel={() => setEditingResume(false)}
            githubUsername={user.github_username ?? null}
          />
        </div>
      ) : (() => {
        // Arrays podem vir undefined do servidor — normaliza antes de ler length.
        const nPos = linkedInData?.positions?.length ?? 0;
        const nEdu = linkedInData?.education?.length ?? 0;
        return (
          <div className="user-profile-linkedin">
            <div className="user-profile-section-label">currículo</div>
            <div className="user-profile-linkedin-info">
              {linkedInData ? (
                <>
                  <span className="user-profile-linkedin-name">{linkedInData.name ?? '—'}</span>
                  <span className="user-profile-linkedin-sub">
                    {nPos} experiência{nPos !== 1 ? 's' : ''} &middot;{' '}
                    {nEdu} formação{nEdu !== 1 ? 'es' : ''}
                  </span>
                </>
              ) : (
                <span className="user-profile-hint">Nenhum currículo cadastrado ainda.</span>
              )}
              <button
                type="button"
                className="user-profile-save-btn"
                style={{ marginTop: 10, width: 'auto' }}
                onClick={() => setEditingResume(true)}
              >
                {linkedInData ? 'editar currículo' : 'criar currículo'}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
