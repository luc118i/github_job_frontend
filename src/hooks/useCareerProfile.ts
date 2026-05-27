import { useState, useCallback, useEffect } from 'react';
import { CareerProfile } from '../types';
import { getToken } from '../services/auth';
import { fetchCareerProfile, persistCareerProfile } from '../services/career';

const STORAGE_KEY = 'jf_career_profile';

function loadLocal(): CareerProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CareerProfile;
  } catch {
    return null;
  }
}

function saveLocal(profile: CareerProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

function clearLocal(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function useCareerProfile() {
  const [profile, setProfileState] = useState<CareerProfile | null>(loadLocal);

  // Ao montar: se autenticado, carrega do banco (sobrepõe localStorage)
  useEffect(() => {
    if (!getToken()) return;
    fetchCareerProfile().then((remote) => {
      if (remote) {
        saveLocal(remote);
        setProfileState(remote);
      }
    }).catch(() => {});
  }, []);

  const setProfile = useCallback((p: CareerProfile) => {
    saveLocal(p);
    setProfileState(p);
    persistCareerProfile(p).catch(() => {});
  }, []);

  const resetProfile = useCallback(() => {
    clearLocal();
    setProfileState(null);
    persistCareerProfile(null).catch(() => {});
  }, []);

  return { profile, setProfile, resetProfile };
}
