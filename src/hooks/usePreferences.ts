import { useState, useEffect } from 'react';
import { UserPreferences } from '../types';

const STORAGE_KEY = 'jobfinder_preferences';

const DEFAULT: UserPreferences = {
  modality: 'any',
  location: '',
  salaryMin: '',
  salaryMax: '',
  level: 'any',
};

export function usePreferences() {
  const [preferences, setPreferencesState] = useState<UserPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT, ...JSON.parse(stored) } : DEFAULT;
    } catch {
      return DEFAULT;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  function setPreferences(next: UserPreferences) {
    setPreferencesState(next);
  }

  function hasPreferences(): boolean {
    return (
      preferences.modality !== 'any' ||
      !!preferences.location ||
      !!preferences.salaryMin ||
      !!preferences.salaryMax ||
      preferences.level !== 'any'
    );
  }

  return { preferences, setPreferences, hasPreferences };
}
