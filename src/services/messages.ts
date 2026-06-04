import { Message, MessageDraft, MessageInput, MessageGenRequest } from '../types';
import { getToken } from './auth';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Cartas/Mensagens (Career Studio M6) ───────────────────────────

/** Gera 1-3 variações da mensagem com IA (não persiste). */
export async function generateMessage(req: MessageGenRequest): Promise<MessageDraft[]> {
  const res = await fetch(`${API_URL}/messages/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao gerar a mensagem.');
  }
  return res.json() as Promise<MessageDraft[]>;
}

export async function fetchMessages(jobId: string): Promise<Message[]> {
  const res = await fetch(`${API_URL}/messages?jobId=${encodeURIComponent(jobId)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao carregar as mensagens.');
  }
  return res.json() as Promise<Message[]>;
}

export async function saveMessage(input: MessageInput): Promise<Message> {
  const res = await fetch(`${API_URL}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao salvar a mensagem.');
  }
  return res.json() as Promise<Message>;
}

export async function updateMessage(id: string, subject: string | null, content: string): Promise<Message> {
  const res = await fetch(`${API_URL}/messages/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ subject, content }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao salvar a mensagem.');
  }
  return res.json() as Promise<Message>;
}

export async function deleteMessage(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/messages/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao excluir a mensagem.');
  }
}
