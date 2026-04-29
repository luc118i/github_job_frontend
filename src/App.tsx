import { useEffect, useState } from 'react';
import { JobRecord, LinkedInData, Profile, ProfessionJobRecord } from './types';
import { Background } from './components/Background';
import { Header } from './components/Header';
import { TabNav, View } from './components/TabNav';
import { LinkedInImport } from './components/LinkedInImport';
import { SearchForm } from './components/SearchForm';
import { LoadingSteps } from './components/LoadingSteps';
import { ProfileCard } from './components/ProfileCard';
import { JobList } from './components/JobList';
import { SearchHistory } from './components/SearchHistory';
import { CvEditor } from './components/CvEditor';
import { ProfessionView } from './components/ProfessionView';
import { PreferencesPanel } from './components/PreferencesPanel';
import { AuthModal } from './components/AuthModal';
import { UserProfile } from './components/UserProfile';
import { Footer } from './components/Footer';
import { useJobSearch } from './hooks/useJobSearch';
import { usePreferences } from './hooks/usePreferences';
import { AuthUser, fetchMe, clearToken, updateLinkedIn } from './services/auth';

interface CvState {
  job: JobRecord;
  profile: Profile;
}

export default function App() {
  const [username, setUsername] = useState('');
  const [view, setView] = useState<View>('outros');
  const [cvState, setCvState] = useState<CvState | null>(null);
  const [linkedInData, setLinkedInData] = useState<LinkedInData | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingLinkedIn, setPendingLinkedIn] = useState<LinkedInData | null>(null);

  const { profile, jobs, loading, step, error, filter, blockedToday: githubBlocked, setFilter, search, removeJob } = useJobSearch();
  const { preferences, setPreferences } = usePreferences();

  useEffect(() => {
    fetchMe().then(result => {
      if (!result) return;
      setCurrentUser(result.user);
      if (result.linkedInData) setLinkedInData(result.linkedInData);
      if (result.user.github_username) setUsername(result.user.github_username);
    });
  }, []);

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
    if (user.github_username) setUsername(user.github_username);
  }

  function handleLogout() {
    clearToken();
    setCurrentUser(null);
    setLinkedInData(null);
  }

  function handleProfileUpdate(updatedUser: AuthUser) {
    setCurrentUser(updatedUser);
    if (updatedUser.github_username) setUsername(updatedUser.github_username);
  }

  function openCv(job: JobRecord, cvProfile: Profile) {
    setCvState({ job, profile: cvProfile });
  }

  function openCvFromProfession(job: ProfessionJobRecord) {
    const syntheticProfile: Profile = {
      user: {
        login: currentUser?.github_username ?? '',
        name: linkedInData?.name ?? currentUser?.name ?? 'Candidato',
        bio: null,
        avatar_url: '',
        followers: 0,
        public_repos: 0,
      },
      repos: [],
      skills: job.skills,
    };
    setCvState({ job, profile: syntheticProfile });
  }

  if (cvState) {
    return (
      <CvEditor
        job={cvState.job}
        profile={cvState.profile}
        linkedIn={linkedInData}
        onBack={() => setCvState(null)}
        onGoToHistory={() => { setCvState(null); setView('history'); }}
        onDismiss={(jobId) => {
          removeJob(jobId);
          setCvState(null);
        }}
      />
    );
  }

  return (
    <div className="app">
      <Background />
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onLoginClick={() => setAuthOpen(true)}
        onProfileClick={() => setView('profile')}
      />

      <AuthModal
        open={authOpen}
        linkedInData={pendingLinkedIn}
        onSuccess={handleAuthSuccess}
        onClose={() => { setAuthOpen(false); setPendingLinkedIn(null); }}
      />

      <main>
        <TabNav active={view} showProfile={!!currentUser} onChange={setView} />

        {view === 'outros' && (
          <ProfessionView
            linkedIn={linkedInData}
            preferences={preferences}
            onImport={handleLinkedInImport}
            onClear={handleLinkedInClear}
            onPreferencesChange={setPreferences}
            onGenerateCv={openCvFromProfession}
            onGoToHistory={() => setView('history')}
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
                  onGoToHistory={() => setView('history')}
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

        {view === 'history' && (
          <>
            <div className="history-linkedin-bar">
              <LinkedInImport
                data={linkedInData}
                onImport={handleLinkedInImport}
                onClear={handleLinkedInClear}
              />
            </div>
            <SearchHistory
              linkedInData={linkedInData}
              githubUsername={currentUser?.github_username ?? null}
              onGenerateCv={openCv}
            />
          </>
        )}

        {view === 'profile' && currentUser && (
          <UserProfile
            user={currentUser}
            linkedInData={linkedInData}
            onUpdate={handleProfileUpdate}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
