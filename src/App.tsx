import { useState } from 'react';
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
import { useJobSearch } from './hooks/useJobSearch';

interface CvState {
  job: JobRecord;
  profile: Profile;
}

export default function App() {
  const [username, setUsername] = useState('');
  const [view, setView] = useState<View>('search');
  const [cvState, setCvState] = useState<CvState | null>(null);
  const [linkedInData, setLinkedInData] = useState<LinkedInData | null>(null);

  const { profile, jobs, loading, step, error, filter, setFilter, search, removeJob } = useJobSearch();

  function openCv(job: JobRecord, cvProfile: Profile) {
    setCvState({ job, profile: cvProfile });
  }

  function openCvFromProfession(job: ProfessionJobRecord) {
    // profession jobs have no github profile; open editor with a minimal profile
    const syntheticProfile: Profile = {
      user: {
        login: '',
        name: linkedInData?.positions[0]
          ? `${linkedInData.positions[0].title}`
          : 'Candidato',
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
      <Header />

      <main>
        <TabNav active={view} onChange={setView} />

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
                    onImport={setLinkedInData}
                    onClear={() => setLinkedInData(null)}
                  />
                </div>
                <SearchForm
                  username={username}
                  loading={loading}
                  error={error}
                  onChange={setUsername}
                  onSearch={() => search(username)}
                />
              </div>

              {loading && <LoadingSteps step={step} />}
            </div>

            {profile && <ProfileCard profile={profile} />}
            {jobs.length > 0 && (
              <JobList
                jobs={jobs}
                filter={filter}
                onFilterChange={setFilter}
                onGenerateCv={(job) => profile && openCv(job, profile)}
              />
            )}
          </>
        )}

        {view === 'history' && (
          <>
            <div className="history-linkedin-bar">
              <LinkedInImport
                data={linkedInData}
                onImport={setLinkedInData}
                onClear={() => setLinkedInData(null)}
              />
            </div>
            <SearchHistory
              linkedInData={linkedInData}
              onGenerateCv={openCv}
            />
          </>
        )}

        {view === 'outros' && (
          <ProfessionView
            linkedIn={linkedInData}
            onImport={setLinkedInData}
            onClear={() => setLinkedInData(null)}
            onGenerateCv={openCvFromProfession}
          />
        )}
      </main>
    </div>
  );
}
