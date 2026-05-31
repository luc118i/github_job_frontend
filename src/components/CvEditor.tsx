import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { JobRecord, Profile, LinkedInData, CvRequest, CvBlock, CvBlockType } from '../types';
import { generateCv, updateCv, CvApiError } from '../services/cv';
import { downloadCvPdf } from '../services/pdfExport';
import { dismissJob } from '../services/jobs';
import { markCvGenerated } from '../utils/dailyLimit';

interface CvEditorProps {
  job: JobRecord;
  profile: Profile;
  linkedIn: LinkedInData | null;
  onBack: () => void;
  onDismiss: (jobId: string) => void;
  onGoToHistory: () => void;
  initialCvId?: string;
  initialContent?: string;
  initialBlocks?: CvBlock[] | null;
}

type MobileTab = 'editor' | 'preview';

// Título padrão + cor da borda esquerda por tipo (tokens do MVC).
const BLOCK_META: Record<CvBlockType, { title: string; color: string }> = {
  resumo: { title: 'RESUMO PROFISSIONAL', color: '#8B5CF6' },
  skills: { title: 'HABILIDADES TÉCNICAS', color: '#F97316' },
  experiencia: { title: 'EXPERIÊNCIA PROFISSIONAL', color: '#14B8A6' },
  projetos: { title: 'PROJETOS RELEVANTES', color: '#EC4899' },
  formacao: { title: 'FORMAÇÃO ACADÊMICA', color: '#4ADE80' },
  certificacoes: { title: 'CERTIFICAÇÕES', color: '#A78BFA' },
  idiomas: { title: 'IDIOMAS', color: '#A78BFA' },
};
const BLOCK_TYPES = Object.keys(BLOCK_META) as CvBlockType[];

function uid(): string {
  return (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ?? `b_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/** Fallback p/ CVs antigos (só Markdown): quebra em blocos pelos headings "## ". */
function markdownToBlocks(md: string): CvBlock[] {
  const sections = md.split(/^##\s+/m).slice(1); // descarta o cabeçalho (# nome)
  return sections.map((sec) => {
    const nl = sec.indexOf('\n');
    const title = (nl === -1 ? sec : sec.slice(0, nl)).trim();
    const content = (nl === -1 ? '' : sec.slice(nl + 1)).trim();
    const type = inferType(title);
    return { id: uid(), type, title: title || BLOCK_META[type].title, content, visible: true };
  });
}

function inferType(title: string): CvBlockType {
  const t = title.toLowerCase();
  if (t.includes('resumo')) return 'resumo';
  if (t.includes('habilidade') || t.includes('skill')) return 'skills';
  if (t.includes('experi')) return 'experiencia';
  if (t.includes('projeto')) return 'projetos';
  if (t.includes('forma')) return 'formacao';
  if (t.includes('certifica')) return 'certificacoes';
  if (t.includes('idioma') || t.includes('language')) return 'idiomas';
  return 'resumo';
}

export function CvEditor({
  job,
  profile,
  linkedIn,
  onBack,
  onDismiss,
  onGoToHistory,
  initialCvId,
  initialContent,
  initialBlocks,
}: CvEditorProps) {
  const isViewMode = initialContent !== undefined;

  const [blocks, setBlocks] = useState<CvBlock[] | null>(null);
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());
  const [cvId, setCvId] = useState<string | null>(initialCvId ?? null);
  const [loading, setLoading] = useState(!isViewMode);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const totalCountdownRef = useRef<number>(0);
  const [mobileTab, setMobileTab] = useState<MobileTab>('preview');
  const [addOpen, setAddOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Cabeçalho (nome + contato) não é bloco — vem dos dados do candidato.
  const candidateName = linkedIn?.name ?? profile.user.name ?? profile.user.login;
  const contactLine = useMemo(() => {
    const parts = [
      linkedIn?.email,
      linkedIn?.phone,
      profile.user.login ? `github.com/${profile.user.login}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(' | ') : '';
  }, [linkedIn, profile.user.login]);

  // Markdown derivado dos blocos visíveis — fonte para preview, PDF e save.
  const markdown = useMemo(() => {
    if (!blocks) return '';
    const header = `# ${candidateName.toUpperCase()}${contactLine ? `\n${contactLine}` : ''}`;
    const body = blocks
      .filter((b) => b.visible)
      .map((b) => `## ${b.title}\n${b.content.trim()}`)
      .join('\n\n');
    return `${header}\n\n${body}`.trim();
  }, [blocks, candidateName, contactLine]);

  async function handleDismiss() {
    setDismissing(true);
    dismissJob(job.id).catch(console.error);
    onDismiss(job.id);
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onBack]);

  function buildRequest(): CvRequest {
    return {
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        level: job.level,
        remote: job.remote,
        skills: job.skills,
        description: job.description,
      },
      candidate: {
        name: candidateName,
        email: linkedIn?.email ?? null,
        phone: linkedIn?.phone ?? null,
        githubLogin: profile.user.login,
        githubBio: profile.user.bio,
        githubFollowers: profile.user.followers,
        githubPublicRepos: profile.user.public_repos,
        skills: profile.skills,
        repos: profile.repos,
        positions: linkedIn?.positions ?? [],
        education: linkedIn?.education ?? [],
      },
    };
  }

  function requestCv() {
    setLoading(true);
    setError('');
    setCountdown(null);
    setBlocks(null);
    generateCv(buildRequest())
      .then((res) => {
        const bl = res.blocks?.length ? res.blocks : markdownToBlocks(res.content);
        setBlocks(bl);
        setCvId(res.cvId);
        markCvGenerated(job.id);
      })
      .catch((e: Error) => {
        setError(e.message);
        if (e instanceof CvApiError && e.retryAfter) {
          totalCountdownRef.current = e.retryAfter;
          setCountdown(e.retryAfter);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (isViewMode) {
      setBlocks(
        initialBlocks?.length ? initialBlocks : markdownToBlocks(initialContent!),
      );
    } else {
      requestCv();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Ações por bloco ──────────────────────────────────────────────
  function patchBlock(id: string, patch: Partial<CvBlock>) {
    setBlocks((prev) => prev && prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function toggleEdit(id: string) {
    setEditingIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleVisible(id: string) {
    setBlocks((prev) => prev && prev.map((b) => (b.id === id ? { ...b, visible: !b.visible } : b)));
  }
  function duplicateBlock(id: string) {
    setBlocks((prev) => {
      if (!prev) return prev;
      const i = prev.findIndex((b) => b.id === id);
      if (i === -1) return prev;
      const copy = { ...prev[i], id: uid(), title: `${prev[i].title} (cópia)` };
      return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
    });
  }
  function removeBlock(id: string) {
    setBlocks((prev) => prev && prev.filter((b) => b.id !== id));
  }
  function addBlock(type: CvBlockType) {
    setBlocks((prev) => [
      ...(prev ?? []),
      { id: uid(), type, title: BLOCK_META[type].title, content: '- [PREENCHER]', visible: true },
    ]);
    setAddOpen(false);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      if (!prev) return prev;
      const from = prev.findIndex((b) => b.id === active.id);
      const to = prev.findIndex((b) => b.id === over.id);
      if (from === -1 || to === -1) return prev;
      return arrayMove(prev, from, to);
    });
  }

  async function handleSave() {
    if (!blocks || !cvId) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await updateCv(cvId, markdown, blocks);
      setSaveMsg('salvo');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch {
      setSaveMsg('erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    if (!markdown) return;
    setPdfLoading(true);
    try {
      await downloadCvPdf(markdown, job.title, job.company);
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="cv-page">
      <div className="cv-topbar">
        <button className="cv-back-btn" onClick={onBack}>Voltar</button>
        <span className="cv-topbar-title">
          {job.title}
          <span className="cv-topbar-company">@ {job.company}</span>
        </span>
        <div className="cv-topbar-actions">
          {blocks && !loading && cvId && (
            <button className="cv-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'salvando...' : saveMsg || 'salvar'}
            </button>
          )}
          {blocks && !loading && (
            <button className="cv-download-btn" disabled={pdfLoading} onClick={handleDownload}>
              {pdfLoading ? 'gerando...' : 'baixar PDF'}
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="cv-page-loading">
          <div className="loading-bar">
            <div className="loading-step">
              <div className="dot" />
              gerando curriculo com ia...
            </div>
            <div className="loading-step">
              <div className="dot" style={{ animationDelay: '0.3s' }} />
              otimizando para ats
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="cv-page-loading">
          <div className="cv-error-block">
            <span className="cv-error-msg">{error}</span>
            {countdown !== null && countdown > 0 && (
              <div className="cv-retry-countdown">
                <div
                  className="cv-retry-progress"
                  style={{ width: `${(countdown / totalCountdownRef.current) * 100}%` }}
                />
                <span className="cv-retry-timer">{countdown}s</span>
              </div>
            )}
            <div className="cv-error-actions">
              <button
                className="cv-back-btn"
                onClick={requestCv}
                disabled={countdown !== null && countdown > 0}
              >
                {countdown !== null && countdown > 0 ? `aguarde ${countdown}s...` : 'tentar novamente'}
              </button>
              <button className="cv-back-btn" onClick={onBack}>voltar</button>
            </div>
          </div>
        </div>
      )}

      {blocks && !loading && (
        <>
          <div className="cv-mobile-tabs">
            <button
              className={`cv-mobile-tab ${mobileTab === 'preview' ? 'active' : ''}`}
              onClick={() => setMobileTab('preview')}
            >
              preview
            </button>
            <button
              className={`cv-mobile-tab ${mobileTab === 'editor' ? 'active' : ''}`}
              onClick={() => setMobileTab('editor')}
            >
              blocos
            </button>
          </div>

          <div className="cv-workspace">
            <div className={`cv-edit-pane ${mobileTab === 'editor' ? 'mobile-active' : ''}`}>
              <div className="cv-pane-label">blocos do currículo</div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="cv-blocks">
                    {blocks.map((block) => (
                      <SortableBlock
                        key={block.id}
                        block={block}
                        editing={editingIds.has(block.id)}
                        onToggleEdit={() => toggleEdit(block.id)}
                        onToggleVisible={() => toggleVisible(block.id)}
                        onDuplicate={() => duplicateBlock(block.id)}
                        onRemove={() => removeBlock(block.id)}
                        onChangeContent={(content) => patchBlock(block.id, { content })}
                        onChangeTitle={(title) => patchBlock(block.id, { title })}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <div className="cv-add-block">
                <button className="cv-add-toggle" onClick={() => setAddOpen((o) => !o)}>
                  + adicionar seção
                </button>
                {addOpen && (
                  <div className="cv-add-menu">
                    {BLOCK_TYPES.map((t) => (
                      <button key={t} className="cv-add-item" onClick={() => addBlock(t)}>
                        {BLOCK_META[t].title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={`cv-preview-pane ${mobileTab === 'preview' ? 'mobile-active' : ''}`}>
              <div className="cv-pane-label">preview</div>
              <div className="cv-paper-wrap">
                <div className="cv-paper">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="cvp-name">{children}</h1>,
                      h2: ({ children }) => <h2 className="cvp-section">{children}</h2>,
                      ul: ({ children }) => <ul className="cvp-list">{children}</ul>,
                      ol: ({ children }) => <ol className="cvp-list">{children}</ol>,
                      li: ({ children }) => <li className="cvp-bullet">{children}</li>,
                      p: ({ children }) => <p className="cvp-line">{children}</p>,
                      strong: ({ children }) => <strong className="cvp-bold">{children}</strong>,
                      a: ({ href, children }) => (
                        <a href={href} className="cvp-link" target="_blank" rel="noopener noreferrer">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {markdown}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>

          <div className="cv-job-bar">
            <span className="cv-job-bar-label">o que achou da vaga?</span>
            <div className="cv-job-bar-actions">
              {job.link && (
                <a href={job.link} target="_blank" rel="noopener noreferrer" className="cv-job-link-btn">
                  Ver vaga
                </a>
              )}
              <button className="history-link-btn" onClick={onGoToHistory}>Ver historico</button>
              <button className="cv-dismiss-btn" disabled={dismissing} onClick={handleDismiss}>
                Nao tenho interesse
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Bloco arrastável ───────────────────────────────────────────────
interface SortableBlockProps {
  block: CvBlock;
  editing: boolean;
  onToggleEdit: () => void;
  onToggleVisible: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onChangeContent: (content: string) => void;
  onChangeTitle: (title: string) => void;
}

function SortableBlock({
  block,
  editing,
  onToggleEdit,
  onToggleVisible,
  onDuplicate,
  onRemove,
  onChangeContent,
  onChangeTitle,
}: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const accent = BLOCK_META[block.type]?.color ?? '#8B5CF6';

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeftColor: accent,
    opacity: isDragging ? 0.6 : block.visible ? 1 : 0.5,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`cv-block ${isDragging ? 'cv-block--dragging' : ''} ${!block.visible ? 'cv-block--hidden' : ''}`}
    >
      <div className="cv-block-head">
        <button className="cv-block-handle" {...attributes} {...listeners} title="Mover" aria-label="Mover bloco">
          ⠿
        </button>
        {editing ? (
          <input
            className="cv-block-title-input"
            value={block.title}
            onChange={(e) => onChangeTitle(e.target.value)}
          />
        ) : (
          <span className="cv-block-title">{block.title}</span>
        )}
        <div className="cv-block-actions">
          <button className="cv-block-action" onClick={onToggleEdit} title="Editar">
            {editing ? 'concluir' : 'editar'}
          </button>
          <button className="cv-block-action" onClick={onToggleVisible} title={block.visible ? 'Ocultar' : 'Mostrar'}>
            {block.visible ? 'ocultar' : 'mostrar'}
          </button>
          <button className="cv-block-action" onClick={onDuplicate} title="Duplicar">duplicar</button>
          <button className="cv-block-action cv-block-action--danger" onClick={onRemove} title="Excluir">excluir</button>
        </div>
      </div>

      {editing ? (
        <textarea
          className="cv-block-textarea"
          value={block.content}
          onChange={(e) => onChangeContent(e.target.value)}
          spellCheck={false}
          rows={Math.max(3, block.content.split('\n').length)}
        />
      ) : (
        <div className="cv-block-body">
          <ReactMarkdown
            components={{
              ul: ({ children }) => <ul className="cvp-list">{children}</ul>,
              li: ({ children }) => <li className="cvp-bullet">{children}</li>,
              p: ({ children }) => <p className="cvp-line">{children}</p>,
              strong: ({ children }) => <strong className="cvp-bold">{children}</strong>,
              a: ({ href, children }) => (
                <a href={href} className="cvp-link" target="_blank" rel="noopener noreferrer">{children}</a>
              ),
            }}
          >
            {block.content || '_(vazio)_'}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
