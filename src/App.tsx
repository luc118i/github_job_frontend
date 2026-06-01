import { lazy, Suspense, useEffect, useState } from 'react';
import { JobRecord, LinkedInData, Profile, ProfessionJobRecord, GitHubRepo, CvBlock } from './types';
import { fetchGitHubRepos, extractSkills } from './services/github';
import { Background } from './components/Background';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { View } from './components/TabNav';
import { BuscarView } from './components/BuscarView';
import { CareerDashboard } from './components/CareerDashboard';
import { LinkedInImport } from './components/LinkedInImport';
import { SearchForm } from './components/SearchForm';
import { LoadingSteps } from './components/LoadingSteps';
import { ProfileCard } from './components/ProfileCard';
import { JobList } from './components/JobList';
import { ProfessionView } from './components/ProfessionView';
import { PreferencesPanel } from './components/PreferencesPanel';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';

// Heavy components — loaded on demand only
const CvEditor         = lazy(() => import('./components/CvEditor').then(m => ({ default: m.CvEditor })));
const KanbanBoard      = lazy(() => import('./components/KanbanBoard').then(m => ({ default: m.KanbanBoard })));
const LinkAnalysisView = lazy(() => import('./components/LinkAnalysisView').then(m => ({ default: m.LinkAnalysisView })));
const OnboardingView   = lazy(() => import('./components/OnboardingView').then(m => ({ default: m.OnboardingView })));
const ProjectLibrary   = lazy(() => import('./components/ProjectLibrary').then(m => ({ default: m.ProjectLibrary })));
import { useJobSearch } from './hooks/useJobSearch';
import { usePreferences } from './hooks/usePreferences';
import { useCareerProfile } from './hooks/useCareerProfile';
import { fetchCareerProfile } from './services/career';
import { AuthUser, fetchMe, clearToken, updateLinkedIn, fetchServerPreferences, updateProfile } from './services/auth';
import { blockKeyword, likeKeyword, blockSource, likeSource, syncPreferencesFromServer } from './utils/jobPreferences';
import { fetchCvByJobId } from './services/cv';

interface CvState {
  job: JobRecord;
  profile: Profile;
  existingCvId?: string;
  existingContent?: string;
  existingBlocks?: CvBlock[] | null;
}

export default function App() {
  const [username, setUsername] = useState('');
  const [view, setView] = useState<View>('buscar');
  const [, setOnboardingDone] = useState(false);
  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [cvState, setCvState] = useState<CvState | null>(null);
  const [linkedInData, setLinkedInData] = useState<LinkedInData | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState<string | undefined>(undefined);
  const [pendingLinkedIn, setPendingLinkedIn] = useState<LinkedInData | null>(null);

  const { profile, jobs, loading, step, error, filter, blockedToday: githubBlocked, remaining: githubRemaining, setFilter, search, removeJob } = useJobSearch();
  const { preferences, setPreferences } = usePreferences();
  const { profile: careerProfile, setProfile: setCareerProfile, resetProfile: resetCareerProfile } = useCareerProfile();

  useEffect(() => {
    fetchMe().then(result => {
      if (!result) return;
      setCurrentUser(result.user);
      if (result.linkedInData) setLinkedInData(result.linkedInData);
      if (result.user.github_username) setUsername(result.user.github_username);
      // Hydrate feedback preferences from server (server wins over stale localStorage)
      fetchServerPreferences().then(prefs => {
        if (prefs) syncPreferencesFromServer(prefs);
      });
    });
  }, []);

  // Áreas exclusivas de quem tem conta: carreira, vagas TI e organizar.
  // Visitante que tente acessá-las (via link/CTA) volta pra 'buscar' e recebe o convite de login.
  useEffect(() => {
    const PROTECTED: View[] = ['career', 'outros', 'history', 'projetos'];
    if (!currentUser && PROTECTED.includes(view)) {
      setView('buscar');
      setAuthReason('Essa área é exclusiva para quem tem conta. Faça login para acessar.');
      setAuthOpen(true);
    }
  }, [view, currentUser]);

  function handleLinkedInImport(data: LinkedInData) {
    setLinkedInData(data);
    if (!currentUser) {
      setPendingLinkedIn(data);
      setAuthOpen(true);
    } else {
      updateLinkedIn(data);
    }
  }

  function handleLinkedInClear() {
    setLinkedInData(null);
  }

  function handleAuthSuccess(user: AuthUser, liData?: LinkedInData) {
    setCurrentUser(user);
    setAuthOpen(false);
    setPendingLinkedIn(null);
    if (liData) setLinkedInData(liData);
    // Hydrate feedback preferences after login
    fetchServerPreferences().then(prefs => {
      if (prefs) syncPreferencesFromServer(prefs);
    });
    if (user.github_username) setUsername(user.github_username);
    // Sync career profile: servidor tem prioridade sobre localStorage.
    // Se o usuário já tinha perfil local (preencheu antes de logar), persiste no servidor.
    // Se não tinha, carrega do servidor (outro dispositivo / sessão anterior).
    fetchCareerProfile().then(remote => {
      if (remote) {
        setCareerProfile(remote); // servidor ganha
      } else if (careerProfile) {
        setCareerProfile(careerProfile); // sobe o local pro servidor
      }
    }).catch(() => {
      if (careerProfile) setCareerProfile(careerProfile);
    });
  }

  function handleLogout() {
    clearToken();
    setCurrentUser(null);
    setLinkedInData(null);
    setView('buscar'); // sai de qualquer área protegida sem disparar o modal de login
  }

  function handleProfileUpdate(updatedUser: AuthUser) {
    setCurrentUser(updatedUser);
    if (updatedUser.github_username) setUsername(updatedUser.github_username);
  }

  async function handleGithubChange(githubUser: string | null) {
    setUsername(githubUser ?? '');
    if (currentUser) {
      try {
        const updated = await updateProfile({ github_username: githubUser });
        setCurrentUser(updated);
      } catch {
        // silently fails — username is still used in-session via setUsername
      }
    }
  }

  function openCv(job: JobRecord, cvProfile: Profile) {
    setCvState({ job, profile: cvProfile });
  }

  async function openExistingCv(job: JobRecord) {
    try {
      const cv = await fetchCvByJobId(job.id);
      const fallback: Profile = profile ?? {
        user: { login: currentUser?.github_username ?? '', name: currentUser?.name ?? '', bio: null, avatar_url: '', followers: 0, public_repos: 0 },
        repos: [],
        skills: job.skills,
      };
      setCvState({ job, profile: fallback, existingCvId: cv.id, existingContent: cv.content, existingBlocks: cv.content_blocks });
    } catch (e) {
      console.error('Erro ao carregar CV:', e);
    }
  }

  async function openCvFromProfession(job: ProfessionJobRecord) {
    const username = currentUser?.github_username;
    let repos: GitHubRepo[] = [];
    let skills: string[] = job.skills;

    // O fluxo da busca não carrega o perfil GitHub (só o useJobSearch carrega),
    // então o CV vinha sem a seção de projetos. Aqui buscamos os repos reais.
    // Best-effort: se falhar (rate limit, sem username), segue sem repos.
    if (username) {
      try {
        repos = await fetchGitHubRepos(username);
        const ghSkills = extractSkills(repos);
        if (ghSkills.length) skills = ghSkills;
      } catch (e) {
        console.warn('Não foi possível carregar repos do GitHub para o CV:', e);
      }
    }

    const syntheticProfile: Profile = {
      user: {
        login: username ?? '',
        name: linkedInData?.name ?? currentUser?.name ?? 'Candidato',
        bio: null,
        avatar_url: '',
        followers: 0,
        public_repos: repos.length,
      },
      repos,
      skills,
    };
    setCvState({ job, profile: syntheticProfile });
  }

  // ── Onboarding: só exibe quando explicitamente solicitado (ex.: clicar em "Descobrir Vagas") ──
  const needsOnboarding = forceOnboarding;

  if (needsOnboarding) {
    return (
      <Suspense fallback={<div className="onb-loading">carregando...</div>}>
        <OnboardingView
          onComplete={(profile, liData) => {
            setCareerProfile(profile);
            if (liData) { setLinkedInData(liData); if (currentUser) updateLinkedIn(liData); }
            setOnboardingDone(true);
            setForceOnboarding(false);
          }}
          onSkip={() => { setOnboardingDone(true); setForceOnboarding(false); }}
        />
      </Suspense>
    );
  }

  if (cvState) {
    return (
      <Suspense fallback={<div className="cv-page-loading"><div className="loading-bar"><div className="loading-step"><div className="dot" />carregando editor...</div></div></div>}>
        <CvEditor
          job={cvState.job}
          profile={cvState.profile}
          linkedIn={linkedInData}
          onBack={() => setCvState(null)}
          onGoToHistory={() => { setCvState(null); setView('history'); }}
          onDismiss={(jobId) => { removeJob(jobId); setCvState(null); }}
          initialCvId={cvState.existingCvId}
          initialContent={cvState.existingContent}
          initialBlocks={cvState.existingBlocks}
        />
      </Suspense>
    );
  }

  return (
    <div className="app">
      <Background />
      <Header
        currentUser={currentUser}
        view={view}
        onViewChange={setView}
        onLogout={handleLogout}
        onLoginClick={() => setAuthOpen(true)}
        onProfileClick={() => setView('career')}
      />

      <AuthModal
        open={authOpen}
        linkedInData={pendingLinkedIn}
        reason={authReason}
        onSuccess={handleAuthSuccess}
        onClose={() => { setAuthOpen(false); setPendingLinkedIn(null); setAuthReason(undefined); }}
      />

      <main className={view === 'history' ? 'kanban-view' : view === 'buscar' ? 'landing-view' : undefined}>
       <ErrorBoundary area={view} onReset={() => setView('buscar')}>

        {view === 'buscar' && (
          <BuscarView
            careerProfile={careerProfile}
            preferences={preferences}
            linkedIn={linkedInData}
            githubUsername={currentUser?.github_username ?? (username || null)}
            onNavigate={setView}
            onGenerateCv={openCvFromProfession}
            onViewCv={(job) => openExistingCv(job)}
            onPreferencesChange={setPreferences}
            onCareerComplete={setCareerProfile}
            onCareerRedo={resetCareerProfile}
            onGithubChange={handleGithubChange}
            onStartOnboarding={() => setForceOnboarding(true)}
          />
        )}

        {view === 'career' && (
          <CareerDashboard
            user={currentUser}
            careerProfile={careerProfile}
            linkedIn={linkedInData}
            preferences={preferences}
            onNavigate={setView}
            onUpdate={handleProfileUpdate}
            onPreferencesChange={setPreferences}
            onCareerRedo={resetCareerProfile}
            onCareerEdit={setCareerProfile}
          />
        )}

        {view === 'outros' && (
          <ProfessionView
            linkedIn={linkedInData}
            preferences={preferences}
            careerProfile={careerProfile}
            githubUsername={currentUser?.github_username ?? (username || null)}
            onImport={handleLinkedInImport}
            onClear={handleLinkedInClear}
            onPreferencesChange={setPreferences}
            onCareerComplete={setCareerProfile}
            onCareerRedo={resetCareerProfile}
            onCareerClose={() => setView('buscar')}
            onGenerateCv={openCvFromProfession}
            onViewCv={(job) => openExistingCv(job)}
            onGoToHistory={() => setView('history')}
            onGithubChange={handleGithubChange}
          />
        )}

        {view === 'search' && (
          <>
            <div className="hero">
              <h1>
                Vagas feitas<br />
                para o seu <span className="accent">código</span>
              </h1>
              <p className="subtitle">
                Conecte seu LinkedIn e GitHub. A IA cruza seus projetos e histórico
                profissional para encontrar vagas que combinam com você.
              </p>

              <div className="search-wrapper">
                <div className="linkedin-section">
                  <LinkedInImport
                    data={linkedInData}
                    onImport={handleLinkedInImport}
                    onClear={handleLinkedInClear}
                  />
                </div>
                <PreferencesPanel
                  preferences={preferences}
                  onChange={setPreferences}
                  defaultOpen
                />
                <SearchForm
                  username={username}
                  loading={loading}
                  error={error}
                  blocked={githubBlocked}
                  remaining={githubRemaining}
                  locationReady={preferences.modality === 'remote' || !!preferences.location}
                  onChange={setUsername}
                  onSearch={() => search(username, preferences)}
                  onGoToHistory={() => setView('history')}
                />
              </div>

              {loading && <LoadingSteps step={step} />}
            </div>

            {profile && <ProfileCard profile={profile} />}
            {jobs.length > 0 && (
              <>
                <JobList
                  jobs={jobs}
                  filter={filter}
                  onFilterChange={setFilter}
                  onGenerateCv={(job) => profile && openCv(job, profile)}
                  onViewCv={(job) => openExistingCv(job)}
                  onLike={(_job, category) => likeKeyword(category)}
                  onBlock={(job, category) => { blockKeyword(category); removeJob(job.id); }}
                  onLikeSource={(_job, src) => likeSource(src)}
                  onBlockSource={(_job, src) => blockSource(src)}
                />
                <div className="results-history-bar">
                  <button className="history-link-btn" onClick={() => setView('history')}>
                    Ver historico de todas as buscas
                  </button>
                </div>
              </>
            )}
          </>
        )}

        <Suspense fallback={<div className="loading-bar" style={{ marginTop: 48 }}><div className="loading-step"><div className="dot" />carregando...</div></div>}>
          {view === 'analise' && (
            <LinkAnalysisView
              profile={profile}
              linkedIn={linkedInData}
              onGenerateCv={(job, cvProfile) => setCvState({ job, profile: cvProfile })}
            />
          )}

          {view === 'history' && (
            <KanbanBoard
              linkedInData={linkedInData}
              githubUsername={currentUser?.github_username ?? null}
              onGenerateCv={openCv}
              onViewCv={(job) => openExistingCv(job)}
            />
          )}

          {view === 'projetos' && (
            <ProjectLibrary githubUsername={currentUser?.github_username ?? (username || null)} />
          )}
        </Suspense>
       </ErrorBoundary>
      </main>
      <Footer />
      <BottomNav currentUser={currentUser} view={view} onViewChange={setView} />
    </div>
  );
}
