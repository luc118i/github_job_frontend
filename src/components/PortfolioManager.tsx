import { useEffect, useState } from 'react';
import { PortfolioSettings, PortfolioTemplate } from '../types';
import { fetchPortfolioSettings, savePortfolioSettings, generatePortfolioTexts } from '../services/portfolio';

interface PortfolioManagerProps {
  /** username do GitHub do usuário — define a URL pública /p/<username>. */
  githubUsername: string | null;
}

export function PortfolioManager({ githubUsername }: PortfolioManagerProps) {
  const [settings, setSettings] = useState<PortfolioSettings | null>(null);
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Gera headline + resumo com IA e preenche os campos (usuário revisa e salva).
  async function generate() {
    setGenerating(true);
    setError('');
    try {
      const draft = await generatePortfolioTexts();
      if (draft.headline) setHeadline(draft.headline);
      if (draft.summary) setSummary(draft.summary);
      setSavedMsg('gerado — revise e salve');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  const publicUrl = githubUsername ? `${window.location.origin}/p/${githubUsername}` : null;

  useEffect(() => {
    let alive = true;
    fetchPortfolioSettings()
      .then((s) => {
        if (!alive) return;
        setSettings(s);
        setHeadline(s.headline ?? '');
        setSummary(s.summary ?? '');
      })
      .catch((e) => alive && setError((e as Error).message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  async function patch(next: Partial<PortfolioSettings>) {
    setSaving(true);
    setError('');
    setSavedMsg('');
    try {
      const updated = await savePortfolioSettings(next);
      setSettings(updated);
      setSavedMsg('alterações salvas');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function copyUrl() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => { /* silencioso */ });
  }

  if (loading) return <div className="pm-page"><div className="pm-state">carregando…</div></div>;

  const published = settings?.published ?? false;

  return (
    <div className="pm-page">
      <header className="pm-head">
        <h1 className="pm-title">Portfólio Público</h1>
        <p className="pm-sub">
          Uma página pública com seu perfil, projetos e experiência — montada a partir do seu
          GitHub, da biblioteca de projetos e do LinkedIn.
        </p>
      </header>

      {error && <div className="pm-error" onClick={() => setError('')}>{error}</div>}

      {!githubUsername && (
        <div className="pm-warn">
          Defina seu <strong>usuário do GitHub</strong> no perfil para ter uma URL pública.
        </div>
      )}

      {/* Toggle publicar */}
      <div className="pm-card">
        <div className="pm-toggle-row">
          <div>
            <span className="pm-toggle-label">{published ? 'Portfólio publicado' : 'Portfólio offline'}</span>
            <span className="pm-toggle-hint">{published ? 'qualquer pessoa com o link pode ver' : 'só você vê — ative para compartilhar'}</span>
          </div>
          <button
            className={`pm-switch${published ? ' pm-switch--on' : ''}`}
            onClick={() => patch({ published: !published })}
            disabled={saving}
            aria-pressed={published}
          >
            <span className="pm-switch-knob" />
          </button>
        </div>

        {published && publicUrl && (
          <div className="pm-url-row">
            <a className="pm-url" href={publicUrl} target="_blank" rel="noopener noreferrer">{publicUrl}</a>
            <button className="pm-mini-btn" onClick={copyUrl}>{copied ? 'copiado!' : 'copiar'}</button>
          </div>
        )}
      </div>

      {/* Textos curados */}
      <div className="pm-card">
        <div className="pm-texts-head">
          <span className="pm-toggle-label">Headline e resumo</span>
          <button className="proj-ai-btn" onClick={generate} disabled={generating}>
            {generating ? 'gerando…' : '✨ Gerar com IA'}
          </button>
        </div>
        <span className="pm-toggle-hint">a IA monta a partir do LinkedIn, projetos e perfil de carreira</span>
        <label className="pm-field">
          <span>Headline</span>
          <input
            value={headline}
            maxLength={120}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Ex.: Gerente de TI · Líder de Implementação"
          />
        </label>
        <label className="pm-field">
          <span>Resumo (sobre você)</span>
          <textarea
            rows={5}
            value={summary}
            maxLength={800}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Um parágrafo apresentando sua trajetória, foco e o que busca."
          />
          <span className="pm-count">{summary.length}/800</span>
        </label>
        <div className="pm-actions">
          {savedMsg && <span className="pm-saved">{savedMsg}</span>}
          <button
            className="pm-save-btn"
            onClick={() => patch({ headline: headline.trim() || null, summary: summary.trim() || null })}
            disabled={saving}
          >
            {saving ? 'salvando…' : 'salvar textos'}
          </button>
        </div>
      </div>

      {/* Seletor de template (v6.0) */}
      <div className="pm-card">
        <span className="pm-toggle-label">Template</span>
        <span className="pm-toggle-hint">cada um adapta o visual e a paleta da página pública</span>
        <div className="pm-templates">
          {TEMPLATES.map((t) => (
            <button
              key={t.value}
              className={`pm-template${settings?.template === t.value ? ' pm-template--active' : ''}`}
              style={{ ['--tpl' as string]: t.color }}
              onClick={() => patch({ template: t.value })}
              disabled={saving}
            >
              <span className="pm-template-dot" />
              <span className="pm-template-name">{t.label}</span>
              <span className="pm-template-for">{t.for}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const TEMPLATES: { value: PortfolioTemplate; label: string; for: string; color: string }[] = [
  { value: 'executivo', label: 'Executivo', for: 'Gestão, liderança', color: '#8B5CF6' },
  { value: 'especialista', label: 'Especialista', for: 'Dados, jurídico, RH', color: '#3B82F6' },
  { value: 'criativo', label: 'Criativo', for: 'Marketing, design', color: '#EC4899' },
  { value: 'tech', label: 'Tech', for: 'Dev, cloud, devops', color: '#22C55E' },
];
