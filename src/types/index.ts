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

export interface CvResponse {
  cvId: string;
  content: string;
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
