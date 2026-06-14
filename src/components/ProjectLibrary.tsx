import { useEffect, useMemo, useState } from 'react';
import { Project, ProjectCategory, ProjectInput, GitHubRepo } from '../types';
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  importProjects,
  enrichProject,
  enrichAllProjects,
} from '../services/projects';
import { fetchGitHubRepos } from '../services/github';
import { CATEGORY, reposToProjectInputs, inferCategory } from '../utils/projectMatch';

interface ProjectLibraryProps {
  /** username do GitHub para auto-importar os repos (best-effort). */
  githubUsername: string | null;
  /** "buscar vagas" a partir das competências/stack de um projeto. */
  onSearchSkills?: (skills: string[]) => void;
}

/** Cor do Portfolio Score: verde ≥85, amarelo ≥60, cinza abaixo. */
function scoreColor(score: number): string {
  if (score >= 85) return '#4ADE80';
  if (score >= 60) return '#F59E0B';
  return '#64748B';
}

/** Termos de busca do projeto: tecnologias (stack) + metodologias (competências), sem duplicar. */
function searchTermsOf(p: Project): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...p.tech, ...(p.competencies ?? [])]) {
    const k = t.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(t.trim());
  }
  return out;
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

export function ProjectLibrary({ githubUsername, onSearchSkills }: ProjectLibraryProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'todos' | ProjectCategory>('todos');
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [enrichingAll, setEnrichingAll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

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

  // Analisa 1 projeto com IA (competências + Portfolio Score).
  async function handleEnrich(id: string) {
    setEnrichingId(id);
    setError(null);
    try {
      const updated = await enrichProject(id);
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao analisar o projeto.');
    } finally {
      setEnrichingId(null);
    }
  }

  // Analisa todos os projetos ainda sem score.
  async function handleEnrichAll() {
    setEnrichingAll(true);
    setError(null);
    try {
      const updated = await enrichAllProjects();
      if (updated.length) {
        const byId = new Map(updated.map((u) => [u.id, u]));
        setProjects((prev) => prev.map((p) => byId.get(p.id) ?? p));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao analisar os projetos.');
    } finally {
      setEnrichingAll(false);
    }
  }

  // Importa os projetos selecionados no modal; opcionalmente enriquece com IA.
  async function handleImport(inputs: ProjectInput[], enrich: boolean) {
    const created = await importProjects(inputs); // backend deduplica
    if (created.length) setProjects((prev) => [...created, ...prev]);
    setImportOpen(false);
    if (enrich && created.length) {
      setEnrichingAll(true);
      try {
        const updated = await enrichAllProjects();
        if (updated.length) {
          const byId = new Map(updated.map((u) => [u.id, u]));
          setProjects((prev) => prev.map((p) => byId.get(p.id) ?? p));
        }
      } catch (e) {
        console.warn('Enriquecimento pós-import falhou:', e);
      } finally {
        setEnrichingAll(false);
      }
    }
  }

  // Estatísticas do topo (Biblioteca v5.0): score médio + nº de competências.
  const stats = useMemo(() => {
    const scored = projects.filter((p) => typeof p.portfolio_score === 'number');
    const avg = scored.length
      ? Math.round(scored.reduce((s, p) => s + (p.portfolio_score ?? 0), 0) / scored.length)
      : null;
    const comps = new Set<string>();
    projects.forEach((p) => (p.competencies ?? []).forEach((c) => comps.add(c.toLowerCase())));
    const pending = projects.filter((p) => p.portfolio_score == null).length;
    return { avg, comps: comps.size, pending };
  }, [projects]);

  return (
    <div className="proj-page">
      <header className="proj-head">
        <div>
          <h1 className="proj-title">Biblioteca de Projetos</h1>
          <p className="proj-sub">
            Repositório de ativos profissionais — alimenta currículo, vagas e portfólio.
            {importing && <span className="proj-importing"> Importando do GitHub…</span>}
          </p>
        </div>
        <div className="proj-head-actions">
          {stats.pending > 0 && (
            <button className="proj-ai-btn" onClick={handleEnrichAll} disabled={enrichingAll}>
              {enrichingAll ? 'analisando…' : `✨ analisar ${stats.pending} com IA`}
            </button>
          )}
          {githubUsername && (
            <button className="proj-mini-btn proj-import-btn" onClick={() => setImportOpen(true)}>Importar GitHub</button>
          )}
          <button className="proj-add-btn" onClick={openCreate}>+ Adicionar projeto</button>
        </div>
      </header>

      {/* Stats do repositório */}
      <div className="proj-stats">
        <span className="proj-stat"><strong>{projects.length}</strong> projetos</span>
        <span className="proj-stat"><strong>{stats.comps}</strong> competências</span>
        <span className="proj-stat"><strong>{stats.avg ?? '—'}</strong> score médio</span>
      </div>

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
            <ProjectCard
              key={p.id}
              project={p}
              enriching={enrichingId === p.id}
              onOpen={() => setSelectedId(p.id)}
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p.id)}
              onEnrich={() => handleEnrich(p.id)}
              onSearch={() => onSearchSkills?.(searchTermsOf(p))}
            />
          ))}
        </div>
      )}

      {selectedId && projects.find((p) => p.id === selectedId) && (
        <ProjectDrawer
          project={projects.find((p) => p.id === selectedId)!}
          enriching={enrichingId === selectedId}
          onClose={() => setSelectedId(null)}
          onEnrich={() => handleEnrich(selectedId)}
          onSearch={(p) => onSearchSkills?.(searchTermsOf(p))}
          onEdit={(p) => { setSelectedId(null); openEdit(p); }}
        />
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

      {importOpen && githubUsername && (
        <ImportModal
          username={githubUsername}
          importedRepos={new Set(projects.map((p) => (p.repo ?? '').toLowerCase()).filter(Boolean))}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
        />
      )}
    </div>
  );
}

// ── Card de projeto (Biblioteca v5.0) ─────────────────────────────
function ProjectCard({
  project: p, enriching, onOpen, onEdit, onDelete, onEnrich, onSearch,
}: {
  project: Project;
  enriching: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEnrich: () => void;
  onSearch: () => void;
}) {
  const meta = CATEGORY[p.category];
  const score = p.portfolio_score;
  const competencies = p.competencies ?? [];
  // Clique no card abre o drawer; os botões internos param a propagação.
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };
  return (
    <article className="proj-card proj-card--clickable" style={{ ['--accent' as string]: meta.color }} onClick={onOpen}>
      <div className="proj-card-top">
        <span className="proj-cat" style={{ color: meta.color, borderColor: meta.color }}>{meta.label}</span>
        {typeof score === 'number'
          ? <span className="proj-score" style={{ color: scoreColor(score), borderColor: scoreColor(score) }}>{score}</span>
          : <span className="proj-score proj-score--na">—</span>}
      </div>

      <h3 className="proj-card-title">{p.title}</h3>
      {p.repo && <span className="proj-slug">{p.repo}</span>}
      {p.description && <p className="proj-card-desc">{p.description}</p>}

      {p.tech.length > 0 && (
        <div className="proj-tech">
          {p.tech.slice(0, 4).map((t) => (
            <span key={t} className="proj-tech-chip" style={{ borderColor: meta.color }}>{t}</span>
          ))}
        </div>
      )}

      {/* Competências detectadas pela IA */}
      {competencies.length > 0 && (
        <div className="proj-comps">
          {competencies.slice(0, 4).map((c) => (
            <span key={c} className="proj-comp">{c}</span>
          ))}
        </div>
      )}

      <div className="proj-card-cta">
        {typeof score === 'number' ? (
          <button className="proj-search-btn" onClick={stop(onSearch)}>Buscar vagas</button>
        ) : (
          <button className="proj-search-btn proj-search-btn--ai" onClick={stop(onEnrich)} disabled={enriching}>
            {enriching ? 'analisando…' : '✨ analisar com IA'}
          </button>
        )}
      </div>

      <div className="proj-card-actions">
        {p.link && <a className="proj-link" href={p.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>abrir ↗</a>}
        <span className="proj-spacer" />
        <button className="proj-mini-btn" onClick={stop(onEdit)}>editar</button>
        <button className="proj-mini-btn proj-mini-btn--danger" onClick={stop(onDelete)}>excluir</button>
      </div>
    </article>
  );
}

// ── Drawer rico de projeto (Biblioteca v5.0) ──────────────────────
const ROLES_BY_CATEGORY: Record<ProjectCategory, string[]> = {
  frontend: ['Desenvolvedor Frontend', 'Desenvolvedor React', 'Engenheiro de UI'],
  backend: ['Desenvolvedor Backend', 'Engenheiro de APIs', 'Desenvolvedor Node'],
  fullstack: ['Desenvolvedor Full Stack', 'Engenheiro de Software'],
  data: ['Analista de Dados', 'Engenheiro de Dados', 'Analista de BI'],
  mobile: ['Desenvolvedor Mobile', 'Desenvolvedor React Native'],
  outro: ['Desenvolvedor de Software'],
};

function marketValue(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Alto', color: '#4ADE80' };
  if (score >= 60) return { label: 'Médio', color: '#F59E0B' };
  return { label: 'Inicial', color: '#64748B' };
}

/** Descrição estilo ATS gerada deterministicamente para colar no currículo. */
function atsDescription(p: Project): string {
  const parts: string[] = [];
  parts.push(p.description ? `${p.title} — ${p.description}` : p.title);
  if (p.tech.length) parts.push(`Tecnologias: ${p.tech.join(', ')}.`);
  if (p.competencies?.length) parts.push(`Competências: ${p.competencies.join(', ')}.`);
  if (p.highlights?.length) parts.push(p.highlights.map((h) => `- ${h}`).join('\n'));
  return parts.join('\n');
}

function ProjectDrawer({
  project: p, enriching, onClose, onEnrich, onSearch, onEdit,
}: {
  project: Project;
  enriching: boolean;
  onClose: () => void;
  onEnrich: () => void;
  onSearch: (p: Project) => void;
  onEdit: (p: Project) => void;
}) {
  const meta = CATEGORY[p.category];
  const score = p.portfolio_score;
  const [copied, setCopied] = useState(false);

  function copyAts() {
    navigator.clipboard.writeText(atsDescription(p)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  }

  return (
    <div className="cv-versions-overlay" onClick={onClose}>
      <aside className="proj-drawer" style={{ ['--accent' as string]: meta.color }} onClick={(e) => e.stopPropagation()}>
        <div className="proj-drawer-head">
          <div>
            <span className="proj-cat" style={{ color: meta.color, borderColor: meta.color }}>{meta.label}</span>
            <h2 className="proj-drawer-title">{p.title}</h2>
            {p.repo && <span className="proj-slug">{p.repo}</span>}
          </div>
          <button className="proj-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="proj-drawer-body">
          {/* KPIs */}
          <div className="proj-kpis">
            <div className="proj-kpi">
              <span className="proj-kpi-val" style={{ color: typeof score === 'number' ? scoreColor(score) : 'rgba(232,228,220,0.4)' }}>
                {typeof score === 'number' ? score : '—'}
              </span>
              <span className="proj-kpi-label">Portfolio Score</span>
            </div>
            <div className="proj-kpi">
              <span className="proj-kpi-val" style={{ color: typeof score === 'number' ? marketValue(score).color : 'rgba(232,228,220,0.4)', fontSize: 16 }}>
                {typeof score === 'number' ? marketValue(score).label : '—'}
              </span>
              <span className="proj-kpi-label">Valor de Mercado</span>
            </div>
            <div className="proj-kpi">
              <span className="proj-kpi-val">{(p.competencies ?? []).length}</span>
              <span className="proj-kpi-label">Competências</span>
            </div>
          </div>

          {typeof score !== 'number' && (
            <button className="proj-search-btn proj-search-btn--ai" onClick={onEnrich} disabled={enriching}>
              {enriching ? 'analisando…' : '✨ analisar com IA (score + competências)'}
            </button>
          )}

          {p.description && <p className="proj-drawer-desc">{p.description}</p>}

          {p.tech.length > 0 && (
            <section className="proj-drawer-section">
              <span className="proj-drawer-label">Tecnologias</span>
              <div className="proj-tech">
                {p.tech.map((t) => <span key={t} className="proj-tech-chip" style={{ borderColor: meta.color }}>{t}</span>)}
              </div>
            </section>
          )}

          {(p.competencies?.length ?? 0) > 0 && (
            <section className="proj-drawer-section">
              <span className="proj-drawer-label">Competências detectadas (IA)</span>
              <div className="proj-comps">
                {p.competencies!.map((c) => <span key={c} className="proj-comp">{c}</span>)}
              </div>
            </section>
          )}

          <section className="proj-drawer-section">
            <span className="proj-drawer-label">Papéis sugeridos</span>
            <div className="proj-comps">
              {ROLES_BY_CATEGORY[p.category].map((r) => <span key={r} className="proj-role">{r}</span>)}
            </div>
          </section>

          <button className="proj-search-btn" onClick={() => onSearch(p)}>Buscar vagas compatíveis</button>

          <section className="proj-drawer-section">
            <div className="proj-drawer-label-row">
              <span className="proj-drawer-label">Descrição para o currículo</span>
              <button className="proj-mini-btn" onClick={copyAts}>{copied ? 'copiado!' : 'copiar'}</button>
            </div>
            <pre className="proj-ats">{atsDescription(p)}</pre>
          </section>

          <div className="proj-drawer-foot">
            <button className="proj-mini-btn" onClick={() => onEdit(p)}>editar projeto</button>
          </div>
        </div>
      </aside>
    </div>
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

// ── Modal de import do GitHub (Biblioteca v5.0) ───────────────────
function ImportModal({
  username, importedRepos, onClose, onImport,
}: {
  username: string;
  importedRepos: Set<string>;
  onClose: () => void;
  onImport: (inputs: ProjectInput[], enrich: boolean) => Promise<void>;
}) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [enrich, setEnrich] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchGitHubRepos(username)
      .then((all) => {
        if (!alive) return;
        const usable = all.filter((r) => !r.fork);
        setRepos(usable);
        // Pré-seleciona os que ainda não estão na biblioteca.
        setSelected(new Set(usable.filter((r) => !importedRepos.has(r.name.toLowerCase())).map((r) => r.name)));
        setLoading(false);
      })
      .catch((e) => { if (alive) { setError(e instanceof Error ? e.message : 'Erro ao buscar repositórios.'); setLoading(false); } });
    return () => { alive = false; };
  }, [username, importedRepos]);

  function toggle(name: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  }

  async function confirm() {
    const chosen = repos.filter((r) => selected.has(r.name) && !importedRepos.has(r.name.toLowerCase()));
    if (chosen.length === 0) { onClose(); return; }
    setImporting(true);
    try {
      await onImport(reposToProjectInputs(chosen), enrich);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao importar.');
      setImporting(false);
    }
  }

  const newCount = repos.filter((r) => selected.has(r.name) && !importedRepos.has(r.name.toLowerCase())).length;

  return (
    <div className="cv-versions-overlay" onClick={onClose}>
      <div className="proj-modal proj-import-modal" onClick={(e) => e.stopPropagation()}>
        <header className="proj-modal-head">
          <div>
            <h2>Importar do GitHub</h2>
            <span className="proj-import-sub">github.com/{username}</span>
          </div>
          <button className="proj-modal-close" onClick={onClose}>✕</button>
        </header>

        <div className="proj-modal-body">
          {error && <div className="proj-error">{error}</div>}
          {loading ? (
            <div className="proj-loading">buscando repositórios…</div>
          ) : repos.length === 0 ? (
            <div className="proj-empty">Nenhum repositório encontrado.</div>
          ) : (
            <div className="proj-import-list">
              {repos.map((r) => {
                const done = importedRepos.has(r.name.toLowerCase());
                const cat = inferCategory(r);
                const meta = CATEGORY[cat];
                return (
                  <label key={r.name} className={`proj-import-row${done ? ' proj-import-row--done' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(r.name)}
                      disabled={done}
                      onChange={() => toggle(r.name)}
                    />
                    <span className="proj-import-info">
                      <span className="proj-import-name">{r.name}</span>
                      <span className="proj-import-meta">
                        {[r.language, ...(r.topics ?? [])].filter(Boolean).slice(0, 3).join(' · ') || 'sem stack detectada'}
                      </span>
                    </span>
                    <span className="proj-cat" style={{ color: meta.color, borderColor: meta.color }}>{meta.label}</span>
                    {done && <span className="proj-import-done-badge">já importado</span>}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <footer className="proj-modal-foot proj-import-foot">
          <label className="proj-import-toggle">
            <input type="checkbox" checked={enrich} onChange={(e) => setEnrich(e.target.checked)} />
            Analisar com IA ao importar (competências + score)
          </label>
          <button className="proj-add-btn" onClick={confirm} disabled={importing || newCount === 0}>
            {importing ? 'importando…' : `Importar ${newCount}`}
          </button>
        </footer>
      </div>
    </div>
  );
}
