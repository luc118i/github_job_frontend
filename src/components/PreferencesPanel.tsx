import { useState, useEffect } from 'react';
import { UserPreferences } from '../types';

async function detectCity(): Promise<string> {
  const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
  );
  const { latitude, longitude } = pos.coords;
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt-BR`
  );
  const data = await res.json() as { address?: Record<string, string> };
  const city = data.address?.city ?? data.address?.town ?? data.address?.municipality ?? '';
  const state = data.address?.state ?? '';
  return city ? `${city}, ${state}` : state;
}

interface PreferencesPanelProps {
  preferences: UserPreferences;
  onChange: (p: UserPreferences) => void;
  defaultOpen?: boolean;
  cardStyle?: boolean;
}

type Modality = UserPreferences['modality'];
type Level = UserPreferences['level'];

const PERIOD_OPTIONS: { value: number; label: string }[] = [
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
  { value: 90, label: '3 meses' },
];

const RADIUS_OPTIONS: { value: number; label: string; icon: string }[] = [
  { value: 30,  label: 'Perto de mim',  icon: '📍' },
  { value: 150, label: 'Minha região',  icon: '🗺️' },
  { value: 0,   label: 'Nacional',      icon: '🇧🇷' },
];

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
  if (p.location) {
    const radiusLabel = p.radiusKm === 30 ? ' · Perto de mim' : p.radiusKm === 150 ? ' · Minha região' : '';
    parts.push(p.location + radiusLabel);
  }
  if (p.salaryMin && p.salaryMax) parts.push(`R$ ${p.salaryMin}–${p.salaryMax}`);
  else if (p.salaryMin) parts.push(`a partir de R$ ${p.salaryMin}`);
  else if (p.salaryMax) parts.push(`até R$ ${p.salaryMax}`);
  if (p.level !== 'any') parts.push(p.level);
  if (p.maxAgeDays !== 90) parts.push(p.maxAgeDays === 30 ? '30 dias' : '60 dias');
  if (p.ptBrOnly) parts.push('🇧🇷 PT-BR');
  return parts.join(' · ');
}

const IconSliders = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <line x1="4" y1="6" x2="18" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="4" y1="11" x2="18" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="4" y1="16" x2="18" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="8" cy="6" r="2" fill="currentColor"/>
    <circle cx="14" cy="11" r="2" fill="currentColor"/>
    <circle cx="9" cy="16" r="2" fill="currentColor"/>
  </svg>
);

export function PreferencesPanel({ preferences, onChange, defaultOpen = false, cardStyle = false }: PreferencesPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [detectingLocation, setDetectingLocation] = useState(false);

  useEffect(() => {
    if (preferences.location || preferences.modality === 'remote' || !navigator.geolocation) return;
    setDetectingLocation(true);
    detectCity()
      .then((city) => { if (city) onChange({ ...preferences, location: city }); })
      .catch(() => {})
      .finally(() => setDetectingLocation(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    onChange({ ...preferences, [key]: value });
  }

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !preferences.location && preferences.modality !== 'remote' && navigator.geolocation) {
      setDetectingLocation(true);
      try {
        const city = await detectCity();
        if (city) onChange({ ...preferences, location: city });
      } catch {
        // permissão negada ou timeout — silencioso, usuário preenche manualmente
      } finally {
        setDetectingLocation(false);
      }
    }
  }

  const summary = summaryText(preferences);
  const hasPrefs = !!summary;

  const locationLabel = preferences.location || (preferences.modality === 'remote' ? 'Remoto' : 'Localizacao');

  return (
    <div className={`prefs-panel${cardStyle ? ' prefs-panel--card' : ''}`}>
      {cardStyle ? (
        <button
          className={`prefs-card-toggle${open ? ' open' : ''}${hasPrefs ? ' has-prefs' : ''}`}
          onClick={handleOpen}
          type="button"
        >
          <div className="prefs-card-icon">
            <IconSliders />
          </div>
          <span className="prefs-card-title">{locationLabel}</span>
          {summary && <span className="prefs-card-sub">{summary}</span>}
        </button>
      ) : (
        <button
          className={`prefs-toggle ${open ? 'open' : ''} ${hasPrefs ? 'has-prefs' : ''}`}
          onClick={handleOpen}
          type="button"
        >
          <span className="prefs-toggle-label">
            {hasPrefs && !open ? summary : 'Preferências de busca'}
          </span>
          <span className="prefs-toggle-icon">{open ? '−' : '+'}</span>
        </button>
      )}

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

          <div className="prefs-row prefs-row--col">
            <span className="prefs-label">Local</span>
            <div className="prefs-input-wrap">
              <input
                className="prefs-input"
                type="text"
                placeholder={detectingLocation ? 'detectando...' : preferences.modality === 'remote' ? 'Remoto' : 'ex: Brasília, DF  ou  São Paulo, SP'}
                value={preferences.location}
                onChange={(e) => set('location', e.target.value)}
                disabled={preferences.modality === 'remote' || detectingLocation}
              />
              {preferences.location && preferences.modality !== 'remote' && (
                <button
                  type="button"
                  className="prefs-input-clear"
                  title="Limpar — busca nacional"
                  onClick={() => set('location', '')}
                >✕</button>
              )}
            </div>
            {preferences.modality !== 'remote' && !preferences.location && (
              <span className="prefs-hint">deixe vazio para busca nacional 🇧🇷</span>
            )}
          </div>

          {/* Raio de distância — só faz sentido em modo presencial/híbrido */}
          {preferences.modality !== 'remote' && (
            <div className="prefs-row">
              <span className="prefs-label">Distância</span>
              <div className="prefs-chips">
                {RADIUS_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={`prefs-chip prefs-chip--radius ${preferences.radiusKm === o.value ? 'active' : ''}`}
                    onClick={() => set('radiusKm', o.value)}
                  >
                    {o.icon} {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Idioma das vagas */}
          <div className="prefs-row prefs-row--toggle">
            <span className="prefs-label">Idioma das vagas</span>
            <button
              type="button"
              className={`prefs-lang-toggle ${preferences.ptBrOnly ? 'active' : ''}`}
              onClick={() => set('ptBrOnly', !preferences.ptBrOnly)}
              title={preferences.ptBrOnly ? 'Mostrando só vagas em português' : 'Mostrando vagas em qualquer idioma'}
            >
              <span className="prefs-lang-flag">🇧🇷</span>
              <span className="prefs-lang-label">
                {preferences.ptBrOnly ? 'Só em português' : 'Qualquer idioma'}
              </span>
              <span className={`prefs-lang-dot ${preferences.ptBrOnly ? 'on' : 'off'}`} />
            </button>
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

          <div className="prefs-row">
            <span className="prefs-label">Periodo</span>
            <div className="prefs-chips">
              {PERIOD_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`prefs-chip ${preferences.maxAgeDays === o.value ? 'active' : ''}`}
                  onClick={() => set('maxAgeDays', o.value)}
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
