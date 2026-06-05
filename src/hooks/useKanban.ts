import { useState, useCallback, useEffect } from 'react';
import { KanbanJobData, KanbanStatus, PipelineEntry } from '../types';
import { fetchPipeline, upsertPipelineEntry } from '../services/pipeline';

// Pipeline CRM (MVC v4.0): os dados agora vivem no Supabase (antes era
// localStorage). O hook carrega tudo na montagem, aplica updates otimistas
// e persiste via API. Mantém a API antiga (get/setStatus/...) + novos campos.

const DEFAULTS: Omit<KanbanJobData, 'movedAt'> = {
  status: 'salvas',
  notes: '',
  favorite: false,
};

function entryToData(e: PipelineEntry): KanbanJobData {
  return {
    status: e.status,
    notes: e.notes ?? '',
    favorite: !!e.favorite,
    movedAt: e.moved_at,
    nextStep: e.next_step ?? undefined,
    nextStepDate: e.next_step_date ?? undefined,
    cvId: e.cv_id ?? undefined,
  };
}

export function useKanban() {
  const [data, setData] = useState<Record<string, KanbanJobData>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchPipeline()
      .then((entries) => {
        if (!alive) return;
        const map: Record<string, KanbanJobData> = {};
        for (const e of entries) map[e.job_id] = entryToData(e);
        setData(map);
      })
      .catch((err) => console.warn('[pipeline] falha ao carregar:', err))
      .finally(() => alive && setReady(true));
    return () => { alive = false; };
  }, []);

  const get = useCallback(
    (id: string): KanbanJobData => data[id] ?? { ...DEFAULTS, movedAt: new Date().toISOString() },
    [data],
  );

  // Aplica patch otimista no estado local e persiste no backend (best-effort).
  const patch = useCallback((id: string, changes: Partial<KanbanJobData>, persist: Parameters<typeof upsertPipelineEntry>[1]) => {
    setData((prev) => {
      const curr = prev[id] ?? { ...DEFAULTS, movedAt: new Date().toISOString() };
      return { ...prev, [id]: { ...curr, ...changes } };
    });
    upsertPipelineEntry(id, persist).catch((err) => console.warn('[pipeline] falha ao salvar:', err));
  }, []);

  const setStatus = useCallback((id: string, status: KanbanStatus) => {
    patch(id, { status, movedAt: new Date().toISOString() }, { status });
  }, [patch]);

  const setNotes = useCallback((id: string, notes: string) => {
    patch(id, { notes }, { notes });
  }, [patch]);

  const toggleFavorite = useCallback((id: string) => {
    setData((prev) => {
      const curr = prev[id] ?? { ...DEFAULTS, movedAt: new Date().toISOString() };
      const favorite = !curr.favorite;
      upsertPipelineEntry(id, { favorite }).catch((err) => console.warn('[pipeline] falha ao salvar:', err));
      return { ...prev, [id]: { ...curr, favorite } };
    });
  }, []);

  // Próxima ação (CRM): texto + data. String vazia limpa o campo.
  const setNextStep = useCallback((id: string, nextStep: string, nextStepDate?: string) => {
    patch(
      id,
      { nextStep: nextStep || undefined, nextStepDate: nextStepDate || undefined },
      { next_step: nextStep || null, next_step_date: nextStepDate || null },
    );
  }, [patch]);

  const setCvId = useCallback((id: string, cvId: string) => {
    patch(id, { cvId: cvId || undefined }, { cv_id: cvId || null });
  }, [patch]);

  return { ready, get, setStatus, setNotes, toggleFavorite, setNextStep, setCvId };
}
