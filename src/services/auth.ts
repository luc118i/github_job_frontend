import { LinkedInData } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'auth_token';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
  linkedInData?: LinkedInData;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function register(
  email: string,
  password: string,
  linkedInData: LinkedInData,
): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, linkedInData }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Erro ao criar conta');
  return data;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Erro ao entrar');
  return data;
}

export async function fetchMe(): Promise<{ user: AuthUser; linkedInData: LinkedInData } | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    clearToken();
    return null;
  }
  return res.json();
}

export async function updateLinkedIn(linkedInData: LinkedInData): Promise<void> {
  const token = getToken();
  if (!token) return;
  await fetch(`${API_URL}/auth/linkedin`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ linkedInData }),
  });
}
