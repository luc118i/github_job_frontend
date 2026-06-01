import { useEffect, useMemo, useState } from 'react';
import { Project, ProjectCategory, ProjectInput } from '../types';
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  importProjects,
} from '../services/projects';
import { fetchGitHubRepos } from '../services/github';
import { CATEGORY, reposToProjectInputs } from '../utils/projectMatch';

interface ProjectLibraryProps {
  /** username do GitHub para auto-importar os repos (best-effort). */
  githubUsername: string | null;
}

// Ordem dos chips de filtro (igual ao print do MVC). 'todos' é virtual.
const FILTERS: { key: 'todos' | ProjectCategory; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'frontend', label: CATEGORY.frontend.label },
  { key: 'backend', label: CATEGORY.backend.label },
  { key: 'fullstack', label: CATEGORY.fullstack.label },
  { key: 'data', label: CATEGORY.data.label },
  { key: 'mobile', label: CATEGORY.mobile.label },
];

const EMPTY_FORM: ProjectInput = {
  title: '',
  description: '',
  tech: [],
  highlights: [],
  category: 'outro',
  link: '',
  repo: null,
};

export function ProjectLibrary({ githubUsername }: ProjectLibraryProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'todos' | ProjectCategory>('todos');

  // Formulário (criar/editar) — null = fechado.
  const [form, setForm] = useState<ProjectInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Carrega a biblioteca e, na primeira vez, auto-importa os repos do GitHub.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const existing = await fetchProjects();
        if (!alive) return;
        setProjects(existing);
        setLoading(false);

        // Auto-import best-effort: só se houver username (não bloqueia a tela).
        if (githubUsername) {
          setImporting(true);
          try {
            const repos = await fetchGitHubRepos(githubUsername);
            const inputs = reposToProjectInputs(repos);
            const created = await importProjects(inputs); // backend deduplica
            if (alive && created.length) {
              setProjects((prev) => [...created, ...prev]);
            }
          } catch (e) {
            console.warn('Auto-import do GitHub falhou:', e);
          } finally {
            if (alive) setImporting(false);
          }
        }
      } catch (e) {
        if (alive) {
          setError(e instanceof Error ? e.message : 'Erro ao carregar projetos.');
          setLoading(false);
        }
      }
    })();
    return () => { alive = false; };
  }, [githubUsername]);

  const visible = useMemo(
    () => (filter === 'todos' ? projects : projects.filter((p) => p.category === filter)),
    [projects, filter],
  );

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  function openEdit(p: Project) {
    setEditingId(p.id);
    setForm({
      title: p.title,
      description: p.description,
      tech: p.tech,
      highlights: p.highlights,
      category: p.category,
      link: p.link,
      repo: p.repo,
    });
  }

  async function handleSave() {
    if (!form || !form.title?.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const updated = await updateProject(editingId, form);
        setProjects((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const created = await createProject(form);
        setProjects((prev) => [created, ...prev]);
      }
      setForm(null);
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar o projeto.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este projeto da biblioteca?')) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir o projeto.');
    }
  }

  return (
    <div className="proj-page">
      <header className="proj-head">
        <div>
          <h1 className="proj-title">Biblioteca de Projetos</h1>
          <p className="proj-sub">
            Seus projetos do GitHub, curados uma vez e reusados nos currículos.
            {importing && <span className="proj-importing"> Importando do GitHub…</span>}
          </p>
        </div>
        <button className="proj-add-btn" onClick={openCreate}>+ Adicionar projeto</button>
      </header>

      {/* Chips de filtro por categoria */}
      <div className="proj-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`proj-chip${filter === f.key ? ' proj-chip--active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="proj-error">{error}</div>}

      {loading ? (
        <div className="proj-loading">carregando projetos…</div>
      ) : visible.length === 0 ? (
        <div className="proj-empty">
          {filter === 'todos'
            ? 'Nenhum projeto ainda. Importe do GitHub ou adicione manualmente.'
            : 'Nenhum projeto nesta categoria.'}
        </div>
      ) : (
        <div className="proj-grid">
          {visible.map((p) => (
            <ProjectCard key={p.id} project={p} onEdit={() => openEdit(p)} onDelete={() => handleDelete(p.id)} />
          ))}
        </div>
      )}

      {form && (
        <ProjectFormModal
          form={form}
          editing={!!editingId}
          saving={saving}
          onChange={setForm}
          onClose={() => { setForm(null); setEditingId(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ── Card de projeto ───────────────────────────────────────────────
function ProjectCard({ project: p, onEdit, onDelete }: { project: Project; onEdit: () => void; onDelete: () => void }) {
  const meta = CATEGORY[p.category];
  return (
    <article className="proj-card" style={{ ['--accent' as string]: meta.color }}>
      <div className="proj-card-top">
        <span className="proj-cat" style={{ color: meta.color, borderColor: meta.color }}>{meta.label}</span>
        {/* "IA: auto" marca projetos importados do GitHub (têm repo de origem) */}
        {p.repo && <span className="proj-auto-badge">IA: auto</span>}
      </div>

      <h3 className="proj-card-title">{p.title}</h3>
      {p.description && <p className="proj-card-desc">{p.description}</p>}

      {p.tech.length > 0 && (
        <div className="proj-tech">
          {p.tech.map((t) => (
            <span key={t} className="proj-tech-chip" style={{ borderColor: meta.color }}>{t}</span>
          ))}
        </div>
      )}

      <div className="proj-card-actions">
        {p.link && <a className="proj-link" href={p.link} target="_blank" rel="noopener noreferrer">abrir ↗</a>}
        <span className="proj-spacer" />
        <button className="proj-mini-btn" onClick={onEdit}>editar</button>
        <button className="proj-mini-btn proj-mini-btn--danger" onClick={onDelete}>excluir</button>
      </div>
    </article>
  );
}

// ── Modal de criação/edição ───────────────────────────────────────
function ProjectFormModal({
  form, editing, saving, onChange, onClose, onSave,
}: {
  form: ProjectInput;
  editing: boolean;
  saving: boolean;
  onChange: (f: ProjectInput) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) => onChange({ ...form, [k]: v });
  const toLines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

  return (
    <div className="cv-versions-overlay" onClick={onClose}>
      <div className="proj-modal" onClick={(e) => e.stopPropagation()}>
        <header className="proj-modal-head">
          <h2>{editing ? 'Editar projeto' : 'Novo projeto'}</h2>
          <button className="proj-modal-close" onClick={onClose}>✕</button>
        </header>

        <div className="proj-modal-body">
          <label className="proj-field">
            <span>Título *</span>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex.: Sistema de Monitoramento de Frota" />
          </label>

          <label className="proj-field">
            <span>Descrição</span>
            <textarea rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="O que o projeto faz, problema que resolve…" />
          </label>

          <label className="proj-field">
            <span>Categoria</span>
            <select value={form.category ?? 'outro'} onChange={(e) => set('category', e.target.value as ProjectCategory)}>
              {(Object.keys(CATEGORY) as ProjectCategory[]).map((c) => (
                <option key={c} value={c}>{CATEGORY[c].label}</option>
              ))}
            </select>
          </label>

          <label className="proj-field">
            <span>Stack (separe por vírgula)</span>
            <input
              value={(form.tech ?? []).join(', ')}
              onChange={(e) => set('tech', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))}
              placeholder="React, TypeScript, Node"
            />
          </label>

          <label className="proj-field">
            <span>Destaques (um por linha)</span>
            <textarea
              rows={3}
              value={(form.highlights ?? []).join('\n')}
              onChange={(e) => set('highlights', toLines(e.target.value))}
              placeholder={'Reduziu o tempo de rota em 30%\nIntegrou 4 sistemas legados'}
            />
          </label>

          <label className="proj-field">
            <span>Link</span>
            <input value={form.link ?? ''} onChange={(e) => set('link', e.target.value)} placeholder="https://…" />
          </label>
        </div>

        <footer className="proj-modal-foot">
          <button className="proj-mini-btn" onClick={onClose} disabled={saving}>cancelar</button>
          <button className="proj-add-btn" onClick={onSave} disabled={saving || !form.title?.trim()}>
            {saving ? 'salvando…' : editing ? 'salvar' : 'adicionar'}
          </button>
        </footer>
      </div>
    </div>
  );
}
