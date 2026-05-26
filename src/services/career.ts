import { CareerChatMessage, CareerProfile } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface CareerMessageResponse {
  message?: string;
  profile?: CareerProfile;
  done: boolean;
}

export async function sendCareerMessage(
  messages: CareerChatMessage[],
): Promise<CareerMessageResponse> {
  const res = await fetch(`${API_URL}/career/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? 'Erro ao enviar mensagem');
  }
  return res.json() as Promise<CareerMessageResponse>;
}
