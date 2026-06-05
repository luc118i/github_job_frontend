export type LinkStatus = 'trusted' | 'unverified' | 'dead' | 'none';

export interface Job {
  title: string;
  company: string;
  level: 'Junior' | 'Pleno' | 'Senior';
  remote: boolean;
  location: string | null;
  skills: string[];
  description: string;
  salary: string | null;
  link: string | null;
}

export interface JobRecord extends Job {
  id: string;
  search_id: string;
  link_status: LinkStatus;
  seen: boolean;
  dismissed: boolean;
  created_at: string;
  published_at?: string | null;
}

export interface SearchRecord {
  id: string;
  github_username: string | null;
  skills: string[];
  created_at: string;
  jobs: JobRecord[];
}

export interface GitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  followers: number;
  public_repos: number;
}

export interface GitHubRepo {
  name: string;
  language: string | null;
  fork: boolean;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  topics: string[];
}

export interface Profile {
  user: GitHubUser;
  repos: GitHubRepo[];
  skills: string[];
}

export interface LinkedInPosition {
  company: string;
  title: string;
  description: string | null;
  location: string | null;
  startedOn: string;
  finishedOn: string | null;
}

export interface LinkedInEducation {
  school: string;
  degree: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

export interface LinkedInCertification {
  name: string;
  authority: string | null;
  licenseNumber: string | null;
  startedOn: string | null;
  finishedOn: string | null;
}

export interface LinkedInData {
  name: string | null;
  email: string | null;
  phone: string | null;
  positions: LinkedInPosition[];
  education: LinkedInEducation[];
  certifications: LinkedInCertification[];
}

export type Step = 'idle' | 'profile' | 'jobs';
export type LevelFilter = 'all' | 'Junior' | 'Pleno' | 'Senior';

export interface UserPreferences {
  modality: 'any' | 'remote' | 'presencial' | 'hybrid';
  location: string;
  salaryMin: string;
  salaryMax: string;
  level: 'any' | 'Junior' | 'Pleno' | 'Senior';
  maxAgeDays: number;
  /** Raio de busca em km. 0 = Nacional. */
  radiusKm: number;
  /** Somente vagas em português. */
  ptBrOnly: boolean;
}

export interface CvRequest {
  job: {
    id: string;
    title: string;
    company: string;
    level: 'Junior' | 'Pleno' | 'Senior';
    remote: boolean;
    skills: string[];
    description: string;
  };
  candidate: {
    name: string;
    email: string | null;
    phone: string | null;
    githubLogin: string;
    githubBio: string | null;
    githubFollowers: number;
    githubPublicRepos: number;
    skills: string[];
    repos: GitHubRepo[];
    positions: LinkedInPosition[];
    education: LinkedInEducation[];
  };
}

// ── CV em blocos (Career Studio M1) — espelha o backend ───────────
export type CvBlockType =
  | 'resumo'
  | 'skills'
  | 'experiencia'
  | 'projetos'
  | 'formacao'
  | 'certificacoes'
  | 'idiomas';

export interface CvBlock {
  id: string;
  type: CvBlockType;
  /** Título exibido da seção, ex: "RESUMO PROFISSIONAL". */
  title: string;
  /** Corpo em Markdown (parágrafo ou bullets "- "). */
  content: string;
  /** Oculto não entra no Markdown derivado nem no PDF. */
  visible: boolean;
}

export interface CvResponse {
  cvId: string;
  content: string;
  blocks: CvBlock[];
}

// Versionamento (Career Studio M2) — espelha o backend.
export type CvVersionSource = 'initial' | 'manual' | 'adapted';

export interface CvVersion {
  id: string;
  cv_id: string;
  content: string;
  content_blocks: CvBlock[] | null;
  label: string;
  source: CvVersionSource;
  created_at: string;
}

// ── Biblioteca de Projetos (Career Studio M5) ─────────────────────
export type ProjectCategory = 'frontend' | 'backend' | 'fullstack' | 'data' | 'mobile' | 'outro';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string;
  tech: string[];
  highlights: string[];
  category: ProjectCategory;
  link: string | null;
  repo: string | null;
  created_at: string;
  updated_at: string;
}

// Payload de criação/edição (sem campos do servidor).
export interface ProjectInput {
  title: string;
  description?: string;
  tech?: string[];
  highlights?: string[];
  category?: ProjectCategory;
  link?: string | null;
  repo?: string | null;
}

/** Score semântico de um projeto para a vaga (IA lê o README). */
export interface ProjectAiMatch {
  id: string;
  /** 0-100 — relevância considerando transferência de competências. */
  score: number;
  /** 1 frase explicando o porquê do score. */
  reason: string;
}

// ── Cartas/Mensagens (Career Studio M6) ───────────────────────────
export type MessageType = 'cover_letter' | 'recruiter_dm' | 'email' | 'follow_up';

export interface Message {
  id: string;
  user_id: string;
  job_id: string;
  type: MessageType;
  subject: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface MessageDraft {
  subject: string | null;
  content: string;
}

export interface MessageInput {
  job_id: string;
  type: MessageType;
  subject?: string | null;
  content: string;
}

// Controles de geração (M6+).
export type MessageTone = 'formal' | 'balanced' | 'casual';
export type MessageLength = 'short' | 'medium' | 'long';
export type MessageLanguage = 'pt' | 'en';

export interface MessageGenRequest {
  type: MessageType;
  job: {
    title: string;
    company: string;
    level: 'Junior' | 'Pleno' | 'Senior';
    remote: boolean;
    skills: string[];
    description: string;
  };
  candidate: {
    name: string;
    bio?: string | null;
    skills?: string[];
    currentRole?: string | null;
    summary?: string | null;
  };
  tone?: MessageTone;
  length?: MessageLength;
  language?: MessageLanguage;
  variations?: number;
}

// ── Interview Studio (Career Studio M7) ───────────────────────────
export interface InterviewJob {
  title: string;
  company: string;
  level: 'Junior' | 'Pleno' | 'Senior';
  remote: boolean;
  skills: string[];
  description: string;
}

export interface InterviewCandidate {
  name: string;
  bio?: string | null;
  skills?: string[];
  currentRole?: string | null;
  summary?: string | null;
  projects?: string[];
}

export type InterviewQCategory = 'tecnica' | 'comportamental';

export interface InterviewQuestion {
  category: InterviewQCategory;
  question: string;
  /** Resposta sugerida (STAR). */
  suggestedAnswer: string;
}

export interface InterviewPrepDraft {
  questions: InterviewQuestion[];
  recruiterQuestions: string[];
}

export interface InterviewPrep extends InterviewPrepDraft {
  id: string;
  user_id: string;
  job_id: string;
  created_at: string;
  updated_at: string;
}

export interface InterviewPrepInput {
  job_id: string;
  questions: InterviewQuestion[];
  recruiterQuestions: string[];
}

export interface InterviewGenRequest {
  job: InterviewJob;
  candidate: InterviewCandidate;
}

/** Turno do chat de simulação. */
export interface InterviewChatTurn {
  role: 'interviewer' | 'candidate';
  content: string;
}

export interface InterviewChatRequest {
  job: InterviewJob;
  candidate: InterviewCandidate;
  history: InterviewChatTurn[];
}

export interface ProfessionJobRecord extends JobRecord {
  match: number;
}

export interface ProfessionSearchResult {
  jobs: ProfessionJobRecord[];
  profileSummary: string;
}

export interface JobFeedItem extends JobRecord {
  github_username: string | null;
}

export interface CvRecord {
  id: string;
  content: string;
  content_blocks?: CvBlock[] | null;
}

// ── Career Profile ─────────────────────────────────────────────────

export type WorkStyle = 'analytical' | 'creative' | 'operational' | 'relational';
export type TechLiteracy = 'basic' | 'intermediate' | 'advanced';
export type LeadershipLevel = 'low' | 'medium' | 'high';

export interface CareerProfile {
  techLiteracy: TechLiteracy;
  leadershipLevel: LeadershipLevel;
  workStyle: WorkStyle[];
  desiredAreas: string[];
  blockedAreas: string[];
  hiddenSkills: string[];
  careerGoals: string;
  transitionReady: boolean;
  transitionTarget: string | null;
  personalitySummary: string;
  potentialSummary: string;
  completedAt: string;
}

export interface CareerChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ── Portfólio Público (Career Studio M8) ──────────────────────────
export interface PortfolioSettings {
  published: boolean;
  headline: string | null;
  summary: string | null;
}

export interface PortfolioProject {
  title: string;
  description: string;
  tech: string[];
  category: string;
  link: string | null;
  repo: string | null;
}

export interface PortfolioData {
  githubUsername: string;
  name: string;
  headline: string | null;
  summary: string | null;
  contactEmail: string | null;
  projects: PortfolioProject[];
  positions: LinkedInPosition[];
  education: LinkedInEducation[];
}

// Pipeline CRM (MVC v4.0) — 7 etapas. 'finalizadas' (legado) vira 'contratado'.
export type KanbanStatus =
  | 'salvas' | 'preparar' | 'aplicadas' | 'em_analise' | 'entrevista' | 'proposta' | 'contratado';

export interface KanbanJobData {
  status: KanbanStatus;
  notes: string;
  favorite: boolean;
  movedAt: string;
  /** Próxima ação (CRM) + data opcional. */
  nextStep?: string;
  nextStepDate?: string; // ISO date YYYY-MM-DD
  /** CV utilizado nessa candidatura (cvs.id). */
  cvId?: string;
}

// ── Pipeline CRM — entrada persistida (espelha o backend) ─────────
export type PipelineStatus = KanbanStatus;

export interface PipelineEntry {
  id: string;
  user_id: string;
  job_id: string;
  status: PipelineStatus;
  favorite: boolean;
  notes: string;
  next_step: string | null;
  next_step_date: string | null;
  cv_id: string | null;
  moved_at: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineEntryInput {
  status?: PipelineStatus;
  favorite?: boolean;
  notes?: string;
  next_step?: string | null;
  next_step_date?: string | null;
  cv_id?: string | null;
}

export interface MatchAnalysis {
  score: number;
  level: 'baixo' | 'medio' | 'alto' | 'excelente';
  strengths: string[];
  gaps: string[];
  missingKeywords: string[];
  recommendations: string[];
  competitiveness: string;
  interviewChance: string;
}

export interface LinkAnalysisResponse {
  job: JobRecord;
  match: MatchAnalysis;
  atsKeywords: string[];
  requirements: string[];
  language: string | null;
}
