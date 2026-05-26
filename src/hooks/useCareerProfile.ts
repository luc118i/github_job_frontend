import { useState, useCallback } from 'react';
import { CareerProfile } from '../types';

const STORAGE_KEY = 'jf_career_profile';

function loadProfile(): CareerProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CareerProfile;
  } catch {
    return null;
  }
}

function saveProfile(profile: CareerProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

function clearProfile(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function useCareerProfile() {
  const [profile, setProfileState] = useState<CareerProfile | null>(loadProfile);

  const setProfile = useCallback((p: CareerProfile) => {
    saveProfile(p);
    setProfileState(p);
  }, []);

  const resetProfile = useCallback(() => {
    clearProfile();
    setProfileState(null);
  }, []);

  return { profile, setProfile, resetProfile };
}
