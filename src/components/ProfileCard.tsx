import { Profile } from '../types';

interface ProfileCardProps {
  profile: Profile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const { user, repos, skills } = profile;
  return (
    <div className="profile-card">
      <img className="avatar" src={user.avatar_url} alt={user.login} />
      <div className="profile-info">
        <h2>{user.name ?? user.login}</h2>
        <div className="handle">
          @{user.login} · {user.followers} seguidores · {repos.length} repositórios
        </div>
        {user.bio && <div className="bio">{user.bio}</div>}
        <div className="skills-row">
          {skills.slice(0, 8).map((s) => (
            <span key={s} className="skill-chip">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
