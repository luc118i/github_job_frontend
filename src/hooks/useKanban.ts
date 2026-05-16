import { useState, useCallback } from 'react';
import { KanbanJobData, KanbanStatus } from '../types';

const STORAGE_KEY = 'jobfinder_kanban';

// Valores padrão para um card novo (sem dados salvos ainda)
const DEFAULTS: Omit<KanbanJobData, 'movedAt'> = {
  status: 'salvas',
  notes: '',
  favorite: false,
};

function load(): Record<string, KanbanJobData> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function persist(data: Record<string, KanbanJobData>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useKanban() {
  const [data, setData] = useState<Record<string, KanbanJobData>>(load);

  // Retorna os dados do card — usa defaults se ainda não foi salvo
  const get = useCallback(
    (id: string): KanbanJobData =>
      data[id] ?? { ...DEFAULTS, movedAt: new Date().toISOString() },
    [data]
  );

  // Move o card para outro status e registra o momento da mudança
  const setStatus = useCallback((id: string, status: KanbanStatus) => {
    setData(prev => {
      const curr = prev[id] ?? { ...DEFAULTS, movedAt: new Date().toISOString() };
      const next = { ...prev, [id]: { ...curr, status, movedAt: new Date().toISOString() } };
      persist(next);
      return next;
    });
  }, []);

  const setNotes = useCallback((id: string, notes: string) => {
    setData(prev => {
      const curr = prev[id] ?? { ...DEFAULTS, movedAt: new Date().toISOString() };
      const next = { ...prev, [id]: { ...curr, notes } };
      persist(next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setData(prev => {
      const curr = prev[id] ?? { ...DEFAULTS, movedAt: new Date().toISOString() };
      const next = { ...prev, [id]: { ...curr, favorite: !curr.favorite } };
      persist(next);
      return next;
    });
  }, []);

  // Define ou limpa o prazo de candidatura (string vazia = sem prazo)
  const setDeadline = useCallback((id: string, deadline: string) => {
    setData(prev => {
      const curr = prev[id] ?? { ...DEFAULTS, movedAt: new Date().toISOString() };
      const next = { ...prev, [id]: { ...curr, deadline: deadline || undefined } };
      persist(next);
      return next;
    });
  }, []);

  return { get, setStatus, setNotes, toggleFavorite, setDeadline };
}
