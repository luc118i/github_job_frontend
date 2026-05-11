import { useEffect, useState } from 'react';

function secsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.ceil((midnight.getTime() - now.getTime()) / 1000));
}

function fmt(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export function useCountdown(active: boolean): string {
  const [secs, setSecs] = useState<number>(secsUntilMidnight);

  useEffect(() => {
    if (!active) return;
    setSecs(secsUntilMidnight());
    const id = setInterval(() => setSecs(secsUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, [active]);

  return active ? fmt(secs) : '';
}
