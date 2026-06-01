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
import { JobRecord, Profile, LinkedInData, CvRequest, CvBlock, CvBlockType, CvVersion, Project, ProjectInput, Message, MessageType } from '../types';
import { generateCv, updateCv, fetchCvVersions, saveCvVersion, adaptCvToJob, CvApiError } from '../services/cv';
import { fetchProjects, createProject, updateProject, deleteProject } from '../services/projects';
import { generateMessage, fetchMessages, saveMessage, updateMessage, deleteMessage } from '../services/messages';
import { downloadCvPdf } from '../services/pdfExport';
import { dismissJob } from '../services/jobs';
import { markCvGenerated } from '../utils/dailyLimit';
import { analyzeAts, atsTier } from '../utils/atsScore';
import { rankProjects, matchTier, projectsToMarkdown } from '../utils/projectMatch';
import { AtsRing } from './AtsRing';

// Form da Biblioteca de Projetos (M5): campos em texto cru; tech vira lista
// por vírgula e highlights por quebra de linha.
interface ProjectForm { title: string; description: string; tech: string; highlights: string; link: string; }
const EMPTY_PROJECT_FORM: ProjectForm = { title: '', description: '', tech: '', highlights: '', link: '' };

// Tipos de mensagem (M6) — rótulo da aba e se usa assunto (e-mail).
const MSG_TYPES: { type: MessageType; label: string; hasSubject: boolean }[] = [
  { type: 'cover_letter', label: 'Carta', hasSubject: false },
  { type: 'recruiter_dm', label: 'Recrutador', hasSubject: false },
  { type: 'email', label: 'E-mail', hasSubject: true },
  { type: 'follow_up', label: 'Follow-up', hasSubject: false },
];

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

const SOURCE_LABEL: Record<CvVersion['source'], string> = {
  initial: 'gerado',
  manual: 'salvo',
  adapted: 'adaptado',
};

/** "agora", "há 5 min", "há 2 h", "há 3 d" ou data curta. */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d} d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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

  // M2 — versionamento
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState<CvVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [versionLabel, setVersionLabel] = useState('');

  // M3 — ATS Center
  const [atsOpen, setAtsOpen] = useState(false);

  // M4 — adaptar para vaga
  const [adapting, setAdapting] = useState(false);
  const [adaptedBlocks, setAdaptedBlocks] = useState<CvBlock[] | null>(null);
  const [adaptError, setAdaptError] = useState('');

  // M5 — Biblioteca de Projetos
  const [libOpen, setLibOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projLoading, setProjLoading] = useState(false);
  const [projError, setProjError] = useState('');
  const [savingProj, setSavingProj] = useState(false);
  const [selectedProj, setSelectedProj] = useState<Set<string>>(new Set());
  // null = form fechado | '' = criando | id = editando
  const [formId, setFormId] = useState<string | null>(null);
  const [projForm, setProjForm] = useState<ProjectForm>(EMPTY_PROJECT_FORM);

  // M6 — Cartas/Mensagens
  const [msgOpen, setMsgOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgError, setMsgError] = useState('');
  const [msgType, setMsgType] = useState<MessageType>('cover_letter');
  const [msgGenerating, setMsgGenerating] = useState(false);
  const [msgSaving, setMsgSaving] = useState(false);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  // Deriva o Markdown (cabeçalho + blocos visíveis) de qualquer lista de blocos.
  const buildMarkdown = useMemo(() => {
    const header = `# ${candidateName.toUpperCase()}${contactLine ? `\n${contactLine}` : ''}`;
    return (bl: CvBlock[]) => {
      const body = bl
        .filter((b) => b.visible)
        .map((b) => `## ${b.title}\n${b.content.trim()}`)
        .join('\n\n');
      return `${header}\n\n${body}`.trim();
    };
  }, [candidateName, contactLine]);

  // Markdown derivado dos blocos visíveis — fonte para preview, PDF e save.
  const markdown = useMemo(() => (blocks ? buildMarkdown(blocks) : ''), [blocks, buildMarkdown]);

  // ATS ao vivo: recalcula a cada edição de bloco/markdown (M3).
  const ats = useMemo(
    () => analyzeAts(blocks ?? [], markdown, { title: job.title, skills: job.skills, description: job.description }),
    [blocks, markdown, job.title, job.skills, job.description],
  );
  const tier = atsTier(ats.score);

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

  // ── Versionamento (M2) ───────────────────────────────────────────
  async function openVersions() {
    setVersionsOpen(true);
    if (!cvId) return;
    setVersionsLoading(true);
    try {
      setVersions(await fetchCvVersions(cvId));
    } catch (e) {
      console.error('Erro ao carregar versões:', e);
    } finally {
      setVersionsLoading(false);
    }
  }

  async function handleSaveVersion() {
    if (!blocks || !cvId) return;
    setSavingVersion(true);
    try {
      const label = versionLabel.trim() || `Versão de ${new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
      // Persiste o estado atual e snapshota numa versão de uma vez só.
      await updateCv(cvId, markdown, blocks);
      await saveCvVersion(cvId, markdown, blocks, label, 'manual');
      setVersionLabel('');
      setVersions(await fetchCvVersions(cvId));
    } catch (e) {
      console.error('Erro ao salvar versão:', e);
    } finally {
      setSavingVersion(false);
    }
  }

  function restoreVersion(v: CvVersion) {
    setBlocks(v.content_blocks?.length ? v.content_blocks : markdownToBlocks(v.content));
    setEditingIds(new Set());
    setVersionsOpen(false);
    setSaveMsg('versão restaurada — salve para confirmar');
    setTimeout(() => setSaveMsg(''), 3000);
  }

  // ── Adaptar para vaga (M4) ───────────────────────────────────────
  async function handleAdapt() {
    if (!blocks || !cvId || adapting) return;
    setAdapting(true);
    setAdaptError('');
    try {
      const optimized = await adaptCvToJob(cvId, blocks, {
        id: job.id,
        title: job.title,
        company: job.company,
        level: job.level,
        remote: job.remote,
        skills: job.skills,
        description: job.description,
      });
      setAdaptedBlocks(optimized);
    } catch (e) {
      setAdaptError((e as Error).message);
    } finally {
      setAdapting(false);
    }
  }

  async function acceptAdapt() {
    if (!adaptedBlocks || !cvId) return;
    const optimized = adaptedBlocks;
    setBlocks(optimized);
    setAdaptedBlocks(null);
    setEditingIds(new Set());
    const md = buildMarkdown(optimized);
    try {
      await updateCv(cvId, md, optimized);
      await saveCvVersion(cvId, md, optimized, `Adaptado para ${job.title}`, 'adapted');
      setSaveMsg('otimização aplicada e versão salva');
    } catch (e) {
      console.error('Erro ao salvar adaptação:', e);
      setSaveMsg('aplicado — falha ao salvar versão');
    }
    setTimeout(() => setSaveMsg(''), 3000);
  }

  // ATS dos blocos otimizados, para o delta no split view.
  const adaptedAts = useMemo(
    () => (adaptedBlocks ? analyzeAts(adaptedBlocks, buildMarkdown(adaptedBlocks), { title: job.title, skills: job.skills, description: job.description }) : null),
    [adaptedBlocks, buildMarkdown, job.title, job.skills, job.description],
  );

  // ── Biblioteca de Projetos (M5) ──────────────────────────────────
  // Ranqueia os projetos por relevância à vaga (determinístico, custo zero).
  const ranked = useMemo(
    () => rankProjects(projects, { title: job.title, skills: job.skills, description: job.description }),
    [projects, job.title, job.skills, job.description],
  );

  async function openLibrary() {
    setLibOpen(true);
    setProjLoading(true);
    setProjError('');
    try {
      setProjects(await fetchProjects());
    } catch (e) {
      setProjError((e as Error).message);
    } finally {
      setProjLoading(false);
    }
  }

  function startNewProject() {
    setProjForm(EMPTY_PROJECT_FORM);
    setFormId('');
  }
  function startEditProject(p: Project) {
    setProjForm({
      title: p.title,
      description: p.description,
      tech: p.tech.join(', '),
      highlights: p.highlights.join('\n'),
      link: p.link ?? '',
    });
    setFormId(p.id);
  }
  function cancelProjectForm() {
    setFormId(null);
    setProjForm(EMPTY_PROJECT_FORM);
  }

  function parseProjectForm(): ProjectInput {
    return {
      title: projForm.title.trim(),
      description: projForm.description.trim(),
      tech: projForm.tech.split(',').map((s) => s.trim()).filter(Boolean),
      highlights: projForm.highlights.split('\n').map((s) => s.trim()).filter(Boolean),
      link: projForm.link.trim() || null,
    };
  }

  async function submitProjectForm() {
    const input = parseProjectForm();
    if (!input.title) {
      setProjError('Informe o título do projeto.');
      return;
    }
    setSavingProj(true);
    setProjError('');
    try {
      if (formId) {
        const upd = await updateProject(formId, input);
        setProjects((prev) => prev.map((p) => (p.id === formId ? upd : p)));
      } else {
        const created = await createProject(input);
        setProjects((prev) => [created, ...prev]);
      }
      cancelProjectForm();
    } catch (e) {
      setProjError((e as Error).message);
    } finally {
      setSavingProj(false);
    }
  }

  async function handleDeleteProject(id: string) {
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setSelectedProj((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      if (formId === id) cancelProjectForm();
    } catch (e) {
      setProjError((e as Error).message);
    }
  }

  function toggleSelectProject(id: string) {
    setSelectedProj((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  // Insere os projetos marcados no bloco "projetos" (cria se não existir).
  function insertSelectedProjects() {
    const chosen = projects.filter((p) => selectedProj.has(p.id));
    if (chosen.length === 0) return;
    const md = projectsToMarkdown(chosen);
    setBlocks((prev) => {
      if (!prev) return prev;
      const i = prev.findIndex((b) => b.type === 'projetos');
      if (i === -1) {
        return [...prev, { id: uid(), type: 'projetos', title: BLOCK_META.projetos.title, content: md, visible: true }];
      }
      const existing = prev[i];
      const merged = existing.content.trim() ? `${existing.content.trim()}\n\n${md}` : md;
      return prev.map((b, idx) => (idx === i ? { ...b, content: merged, visible: true } : b));
    });
    setSelectedProj(new Set());
    setLibOpen(false);
    setSaveMsg('projetos inseridos — salve para confirmar');
    setTimeout(() => setSaveMsg(''), 3000);
  }

  // ── Cartas/Mensagens (M6) ────────────────────────────────────────
  const msgHasSubject = msgType === 'email';
  const savedForType = useMemo(() => messages.filter((m) => m.type === msgType), [messages, msgType]);

  async function openMessages() {
    setMsgOpen(true);
    setMsgLoading(true);
    setMsgError('');
    try {
      setMessages(await fetchMessages(job.id));
    } catch (e) {
      setMsgError((e as Error).message);
    } finally {
      setMsgLoading(false);
    }
  }

  // Monta o contexto do candidato a partir dos dados já disponíveis no editor.
  function buildMsgCandidate() {
    const p0 = linkedIn?.positions?.[0];
    const currentRole = p0 ? `${p0.title} @ ${p0.company}` : null;
    const resumo = blocks?.find((b) => b.type === 'resumo' && b.visible);
    return {
      name: candidateName,
      bio: profile.user.bio,
      skills: profile.skills,
      currentRole,
      summary: resumo?.content ?? null,
    };
  }

  function switchMsgType(t: MessageType) {
    setMsgType(t);
    setEditingMsgId(null);
    setDraftSubject('');
    setDraftContent('');
  }

  async function handleGenerateMsg() {
    if (msgGenerating) return;
    setMsgGenerating(true);
    setMsgError('');
    try {
      const draft = await generateMessage({
        type: msgType,
        job: {
          title: job.title,
          company: job.company,
          level: job.level,
          remote: job.remote,
          skills: job.skills,
          description: job.description,
        },
        candidate: buildMsgCandidate(),
      });
      setDraftSubject(draft.subject ?? '');
      setDraftContent(draft.content);
      setEditingMsgId(null);
    } catch (e) {
      setMsgError((e as Error).message);
    } finally {
      setMsgGenerating(false);
    }
  }

  async function handleSaveMsg() {
    if (!draftContent.trim() || msgSaving) return;
    const subject = msgHasSubject ? draftSubject.trim() || null : null;
    setMsgSaving(true);
    setMsgError('');
    try {
      if (editingMsgId) {
        const upd = await updateMessage(editingMsgId, subject, draftContent);
        setMessages((prev) => prev.map((m) => (m.id === editingMsgId ? upd : m)));
      } else {
        const created = await saveMessage({ job_id: job.id, type: msgType, subject, content: draftContent });
        setMessages((prev) => [created, ...prev]);
        setEditingMsgId(created.id);
      }
    } catch (e) {
      setMsgError((e as Error).message);
    } finally {
      setMsgSaving(false);
    }
  }

  function loadMessageToDraft(m: Message) {
    setMsgType(m.type);
    setDraftSubject(m.subject ?? '');
    setDraftContent(m.content);
    setEditingMsgId(m.id);
  }

  async function handleDeleteMsg(id: string) {
    try {
      await deleteMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (editingMsgId === id) {
        setEditingMsgId(null);
        setDraftSubject('');
        setDraftContent('');
      }
    } catch (e) {
      setMsgError((e as Error).message);
    }
  }

  async function copyDraft() {
    const text = msgHasSubject && draftSubject.trim()
      ? `Assunto: ${draftSubject.trim()}\n\n${draftContent}`
      : draftContent;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponível — silencioso */
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
          {blocks && !loading && (
            <button className="cv-ats-badge" onClick={() => setAtsOpen(true)} title="ATS Center">
              <AtsRing score={ats.score} color={tier.color} size={34} stroke={4} />
              <span className="cv-ats-badge-label">ATS</span>
            </button>
          )}
          {blocks && !loading && cvId && (
            <button className="cv-adapt-btn" onClick={handleAdapt} disabled={adapting} title="Reescrever o CV mirando esta vaga">
              {adapting ? 'adaptando...' : 'adaptar p/ vaga'}
            </button>
          )}
          {blocks && !loading && cvId && (
            <button className="cv-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'salvando...' : saveMsg || 'salvar'}
            </button>
          )}
          {blocks && !loading && (
            <button className="cv-versions-btn" onClick={openLibrary} title="Biblioteca de Projetos">
              projetos
            </button>
          )}
          {blocks && !loading && (
            <button className="cv-versions-btn" onClick={openMessages} title="Cartas e mensagens">
              mensagens
            </button>
          )}
          {blocks && !loading && cvId && (
            <button className="cv-versions-btn" onClick={openVersions}>
              versões
            </button>
          )}
          {blocks && !loading && (
            <button className="cv-download-btn" disabled={pdfLoading} onClick={handleDownload}>
              {pdfLoading ? 'gerando...' : 'baixar PDF'}
            </button>
          )}
        </div>
      </div>

      {atsOpen && (
        <div className="cv-versions-overlay" onClick={() => setAtsOpen(false)}>
          <aside className="cv-versions-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cv-versions-head">
              <span className="cv-versions-title">ATS Center</span>
              <button className="cv-versions-close" onClick={() => setAtsOpen(false)}>fechar</button>
            </div>

            <div className="cv-ats-overview">
              <AtsRing score={ats.score} color={tier.color} size={104} stroke={9} />
              <div className="cv-ats-overview-info">
                <span className="cv-ats-tier" style={{ color: tier.color }}>{tier.label}</span>
                <span className="cv-ats-overview-sub">compatibilidade com a vaga</span>
              </div>
            </div>

            <div className="cv-ats-subscores">
              {ats.subscores.map((s) => {
                const t = atsTier(s.score);
                return (
                  <div key={s.key} className="cv-ats-sub">
                    <div className="cv-ats-sub-head">
                      <span className="cv-ats-sub-label">{s.label}</span>
                      <span className="cv-ats-sub-score" style={{ color: t.color }}>{s.score}</span>
                    </div>
                    <div className="cv-ats-bar">
                      <div className="cv-ats-bar-fill" style={{ width: `${s.score}%`, background: t.color }} />
                    </div>
                    <span className="cv-ats-sub-hint">{s.hint}</span>
                  </div>
                );
              })}
            </div>

            <p className="cv-ats-foot">O score atualiza ao vivo conforme você edita os blocos.</p>
          </aside>
        </div>
      )}

      {adaptError && !adaptedBlocks && (
        <div className="cv-adapt-toast" onClick={() => setAdaptError('')}>{adaptError}</div>
      )}

      {adaptedBlocks && adaptedAts && (
        <div className="cv-adapt-overlay">
          <div className="cv-adapt-modal">
            <div className="cv-adapt-head">
              <div className="cv-adapt-head-info">
                <span className="cv-adapt-title">Adaptar para {job.title}</span>
                <span className="cv-adapt-delta">
                  ATS <strong>{ats.score}</strong>
                  <span className="cv-adapt-arrow">→</span>
                  <strong style={{ color: atsTier(adaptedAts.score).color }}>{adaptedAts.score}</strong>
                  {adaptedAts.score - ats.score > 0 && (
                    <span className="cv-adapt-gain">+{adaptedAts.score - ats.score}</span>
                  )}
                </span>
              </div>
              <div className="cv-adapt-actions">
                <button className="cv-adapt-discard" onClick={() => setAdaptedBlocks(null)}>descartar</button>
                <button className="cv-adapt-accept" onClick={acceptAdapt}>aceitar otimização</button>
              </div>
            </div>

            <div className="cv-adapt-cols">
              <div className="cv-adapt-col">
                <div className="cv-adapt-col-label">Original</div>
                {blocks!.filter((b) => b.visible).map((b) => (
                  <AdaptCard key={`o-${b.id}`} title={b.title} content={b.content} />
                ))}
              </div>
              <div className="cv-adapt-col cv-adapt-col--opt">
                <div className="cv-adapt-col-label">Otimizado</div>
                {adaptedBlocks.filter((b) => b.visible).map((b) => (
                  <AdaptCard key={`a-${b.id}`} title={b.title} content={b.content} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {versionsOpen && (
        <div className="cv-versions-overlay" onClick={() => setVersionsOpen(false)}>
          <aside className="cv-versions-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cv-versions-head">
              <span className="cv-versions-title">Histórico de versões</span>
              <button className="cv-versions-close" onClick={() => setVersionsOpen(false)}>fechar</button>
            </div>

            <div className="cv-versions-save">
              <input
                className="cv-versions-input"
                placeholder="rótulo desta versão (opcional)"
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveVersion(); }}
              />
              <button className="cv-versions-save-btn" onClick={handleSaveVersion} disabled={savingVersion}>
                {savingVersion ? 'salvando...' : 'salvar versão'}
              </button>
            </div>

            <div className="cv-versions-list">
              {versionsLoading && <div className="cv-versions-empty">carregando...</div>}
              {!versionsLoading && versions.length === 0 && (
                <div className="cv-versions-empty">nenhuma versão ainda</div>
              )}
              {!versionsLoading && versions.map((v) => (
                <div key={v.id} className="cv-version-item">
                  <div className="cv-version-info">
                    <span className="cv-version-label">{v.label}</span>
                    <span className="cv-version-meta">
                      <span className={`cv-version-tag cv-version-tag--${v.source}`}>{SOURCE_LABEL[v.source]}</span>
                      {relativeTime(v.created_at)}
                    </span>
                  </div>
                  <button className="cv-version-restore" onClick={() => restoreVersion(v)}>restaurar</button>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      {libOpen && (
        <div className="cv-versions-overlay" onClick={() => setLibOpen(false)}>
          <aside className="cv-lib-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cv-versions-head">
              <span className="cv-versions-title">Biblioteca de Projetos</span>
              <button className="cv-versions-close" onClick={() => setLibOpen(false)}>fechar</button>
            </div>

            <p className="cv-lib-sub">
              Ordenados por relevância para <strong>{job.title}</strong>. Marque e insira no bloco de projetos.
            </p>

            {projError && <div className="cv-lib-error" onClick={() => setProjError('')}>{projError}</div>}

            {/* Form de criar/editar */}
            {formId === null ? (
              <button className="cv-lib-new" onClick={startNewProject}>+ novo projeto</button>
            ) : (
              <div className="cv-lib-form">
                <input
                  className="cv-versions-input"
                  placeholder="título do projeto *"
                  value={projForm.title}
                  onChange={(e) => setProjForm((f) => ({ ...f, title: e.target.value }))}
                />
                <textarea
                  className="cv-lib-textarea"
                  placeholder="descrição curta (o que é / seu papel)"
                  value={projForm.description}
                  rows={2}
                  onChange={(e) => setProjForm((f) => ({ ...f, description: e.target.value }))}
                />
                <input
                  className="cv-versions-input"
                  placeholder="stack / tecnologias (separe por vírgula)"
                  value={projForm.tech}
                  onChange={(e) => setProjForm((f) => ({ ...f, tech: e.target.value }))}
                />
                <textarea
                  className="cv-lib-textarea"
                  placeholder="destaques / conquistas (um por linha)"
                  value={projForm.highlights}
                  rows={3}
                  onChange={(e) => setProjForm((f) => ({ ...f, highlights: e.target.value }))}
                />
                <input
                  className="cv-versions-input"
                  placeholder="link (opcional)"
                  value={projForm.link}
                  onChange={(e) => setProjForm((f) => ({ ...f, link: e.target.value }))}
                />
                <div className="cv-lib-form-actions">
                  <button className="cv-lib-cancel" onClick={cancelProjectForm}>cancelar</button>
                  <button className="cv-versions-save-btn" onClick={submitProjectForm} disabled={savingProj}>
                    {savingProj ? 'salvando...' : formId ? 'salvar alterações' : 'adicionar à biblioteca'}
                  </button>
                </div>
              </div>
            )}

            {/* Lista ranqueada */}
            <div className="cv-versions-list">
              {projLoading && <div className="cv-versions-empty">carregando...</div>}
              {!projLoading && ranked.length === 0 && (
                <div className="cv-versions-empty">nenhum projeto na biblioteca ainda</div>
              )}
              {!projLoading && ranked.map(({ project: p, score, matched }) => {
                const mt = matchTier(score);
                const checked = selectedProj.has(p.id);
                return (
                  <div key={p.id} className={`cv-lib-item ${checked ? 'cv-lib-item--sel' : ''}`}>
                    <label className="cv-lib-check">
                      <input type="checkbox" checked={checked} onChange={() => toggleSelectProject(p.id)} />
                    </label>
                    <div className="cv-lib-item-body">
                      <div className="cv-lib-item-head">
                        <span className="cv-lib-item-title">{p.title}</span>
                        <span className="cv-lib-match" style={{ color: mt.color, borderColor: mt.color }}>
                          {score}% match · {mt.label}
                        </span>
                      </div>
                      {p.description && <span className="cv-lib-item-desc">{p.description}</span>}
                      {p.tech.length > 0 && (
                        <div className="cv-lib-tags">
                          {p.tech.map((t) => (
                            <span key={t} className={`cv-lib-tag ${matched.includes(t) ? 'cv-lib-tag--hit' : ''}`}>{t}</span>
                          ))}
                        </div>
                      )}
                      <div className="cv-lib-item-actions">
                        <button className="cv-block-action" onClick={() => startEditProject(p)}>editar</button>
                        <button className="cv-block-action cv-block-action--danger" onClick={() => handleDeleteProject(p.id)}>excluir</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedProj.size > 0 && (
              <button className="cv-lib-insert" onClick={insertSelectedProjects}>
                inserir {selectedProj.size} no currículo
              </button>
            )}
          </aside>
        </div>
      )}

      {msgOpen && (
        <div className="cv-versions-overlay" onClick={() => setMsgOpen(false)}>
          <aside className="cv-lib-panel" onClick={(e) => e.stopPropagation()}>
            <div className="cv-versions-head">
              <span className="cv-versions-title">Cartas e mensagens</span>
              <button className="cv-versions-close" onClick={() => setMsgOpen(false)}>fechar</button>
            </div>

            <div className="cv-msg-tabs">
              {MSG_TYPES.map((t) => (
                <button
                  key={t.type}
                  className={`cv-msg-tab ${msgType === t.type ? 'active' : ''}`}
                  onClick={() => switchMsgType(t.type)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {msgError && <div className="cv-lib-error" onClick={() => setMsgError('')}>{msgError}</div>}

            <div className="cv-msg-draft">
              {msgHasSubject && (
                <input
                  className="cv-versions-input"
                  placeholder="assunto do e-mail"
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                />
              )}
              <textarea
                className="cv-lib-textarea cv-msg-textarea"
                placeholder={msgGenerating ? 'gerando com IA...' : 'gere com IA ou escreva sua mensagem aqui'}
                value={draftContent}
                rows={9}
                onChange={(e) => setDraftContent(e.target.value)}
              />
              <div className="cv-msg-actions">
                <button className="cv-adapt-btn" onClick={handleGenerateMsg} disabled={msgGenerating}>
                  {msgGenerating ? 'gerando...' : draftContent.trim() ? 'gerar de novo' : 'gerar com IA'}
                </button>
                {draftContent.trim() && (
                  <>
                    <button className="cv-msg-copy" onClick={copyDraft}>{copied ? 'copiado!' : 'copiar'}</button>
                    <button className="cv-versions-save-btn" onClick={handleSaveMsg} disabled={msgSaving}>
                      {msgSaving ? 'salvando...' : editingMsgId ? 'salvar alterações' : 'salvar'}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="cv-versions-list">
              {msgLoading && <div className="cv-versions-empty">carregando...</div>}
              {!msgLoading && savedForType.length === 0 && (
                <div className="cv-versions-empty">nenhuma mensagem salva deste tipo</div>
              )}
              {!msgLoading && savedForType.map((m) => (
                <div key={m.id} className={`cv-msg-item ${editingMsgId === m.id ? 'cv-msg-item--sel' : ''}`}>
                  <div className="cv-msg-item-body" onClick={() => loadMessageToDraft(m)}>
                    {m.subject && <span className="cv-msg-item-subject">{m.subject}</span>}
                    <span className="cv-msg-item-preview">{m.content.slice(0, 120)}{m.content.length > 120 ? '...' : ''}</span>
                    <span className="cv-version-meta">{relativeTime(m.updated_at)}</span>
                  </div>
                  <button className="cv-block-action cv-block-action--danger" onClick={() => handleDeleteMsg(m.id)}>excluir</button>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

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

// ── Card de comparação (split view do M4) ──────────────────────────
function AdaptCard({ title, content }: { title: string; content: string }) {
  return (
    <div className="cv-adapt-card">
      <div className="cv-adapt-card-title">{title}</div>
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
          {content || '_(vazio)_'}
        </ReactMarkdown>
      </div>
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
