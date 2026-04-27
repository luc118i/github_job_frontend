export type LinkStatus = 'trusted' | 'unverified' | 'dead' | 'none';

export interface Job {
  title: string;
  company: string;
  level: 'Junior' | 'Pleno' | 'Senior';
  remote: boolean;
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

export interface LinkedInData {
  positions: LinkedInPosition[];
  education: LinkedInEducation[];
}

export type Step = 'idle' | 'profile' | 'jobs';
export type LevelFilter = 'all' | 'Junior' | 'Pleno' | 'Senior';

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
