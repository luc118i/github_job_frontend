/**
 * Formata uma data ISO como tempo relativo até agora ("há N dias" / "N DIAS"),
 * bucketizando em dia → dias → semanas → meses. Dois estilos de saída porque
 * os dois usos vêm de contextos visuais diferentes:
 *   - 'badge'  — maiúsculas, compacto (badge de publicação no JobCard)
 *   - 'phrase' — minúsculas, com "há" (timeline/data no KanbanBoard)
 */
export function formatRelativeDate(dateStr: string, style: 'badge' | 'phrase'): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);

  if (style === 'badge') {
    if (days === 0) return 'HOJE';
    if (days === 1) return '1 DIA';
    if (days < 7) return `${days} DIAS`;
    const w = Math.floor(days / 7);
    if (w < 5) return `${w} SEMANA${w > 1 ? 'S' : ''}`;
    const m = Math.floor(days / 30);
    return `${m} ${m === 1 ? 'MÊS' : 'MESES'}`;
  }

  if (days === 0) return 'hoje';
  if (days === 1) return 'há 1 dia';
  if (days < 7) return `há ${days} dias`;
  const w = Math.floor(days / 7);
  if (w < 5) return w === 1 ? 'há 1 sem.' : `há ${w} sem.`;
  return `há ${Math.floor(days / 30)} meses`;
}
