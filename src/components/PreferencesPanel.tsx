import { useState } from 'react';
import { UserPreferences } from '../types';

interface PreferencesPanelProps {
  preferences: UserPreferences;
  onChange: (p: UserPreferences) => void;
}

type Modality = UserPreferences['modality'];
type Level = UserPreferences['level'];

const MODALITY_OPTIONS: { value: Modality; label: string }[] = [
  { value: 'any', label: 'Qualquer' },
  { value: 'remote', label: 'Remoto' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'hybrid', label: 'Híbrido' },
];

const LEVEL_OPTIONS: { value: Level; label: string }[] = [
  { value: 'any', label: 'Qualquer' },
  { value: 'Junior', label: 'Junior' },
  { value: 'Pleno', label: 'Pleno' },
  { value: 'Senior', label: 'Senior' },
];

function summaryText(p: UserPreferences): string {
  const parts: string[] = [];
  if (p.modality !== 'any') parts.push({ remote: 'Remoto', presencial: 'Presencial', hybrid: 'Híbrido' }[p.modality]);
  if (p.location) parts.push(p.location);
  if (p.salaryMin && p.salaryMax) parts.push(`R$ ${p.salaryMin}–${p.salaryMax}`);
  else if (p.salaryMin) parts.push(`a partir de R$ ${p.salaryMin}`);
  else if (p.salaryMax) parts.push(`até R$ ${p.salaryMax}`);
  if (p.level !== 'any') parts.push(p.level);
  return parts.join(' · ');
}

export function PreferencesPanel({ preferences, onChange }: PreferencesPanelProps) {
  const [open, setOpen] = useState(false);

  function set<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    onChange({ ...preferences, [key]: value });
  }

  const summary = summaryText(preferences);
  const hasPrefs = !!summary;

  return (
    <div className="prefs-panel">
      <button
        className={`prefs-toggle ${open ? 'open' : ''} ${hasPrefs ? 'has-prefs' : ''}`}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span className="prefs-toggle-label">
          {hasPrefs && !open ? summary : 'Preferências de busca'}
        </span>
        <span className="prefs-toggle-icon">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="prefs-body">
          <div className="prefs-row">
            <span className="prefs-label">Modalidade</span>
            <div className="prefs-chips">
              {MODALITY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`prefs-chip ${preferences.modality === o.value ? 'active' : ''}`}
                  onClick={() => set('modality', o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="prefs-row">
            <span className="prefs-label">Local</span>
            <input
              className="prefs-input"
              type="text"
              placeholder="ex: São Paulo, SP"
              value={preferences.location}
              onChange={(e) => set('location', e.target.value)}
              disabled={preferences.modality === 'remote'}
            />
          </div>

          <div className="prefs-row">
            <span className="prefs-label">Salário (R$)</span>
            <div className="prefs-salary-row">
              <input
                className="prefs-input prefs-salary"
                type="text"
                placeholder="mínimo"
                value={preferences.salaryMin}
                onChange={(e) => set('salaryMin', e.target.value.replace(/\D/g, ''))}
              />
              <span className="prefs-salary-sep">–</span>
              <input
                className="prefs-input prefs-salary"
                type="text"
                placeholder="máximo"
                value={preferences.salaryMax}
                onChange={(e) => set('salaryMax', e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          <div className="prefs-row">
            <span className="prefs-label">Nível</span>
            <div className="prefs-chips">
              {LEVEL_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`prefs-chip ${preferences.level === o.value ? 'active' : ''}`}
                  onClick={() => set('level', o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
