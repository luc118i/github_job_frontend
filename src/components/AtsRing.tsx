import { useId } from 'react';

interface AtsRingProps {
  /** 0-100 */
  score: number;
  color: string;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
}

// Ring de score ATS animado (Career Studio M3 / MVC p.11).
export function AtsRing({ score, color, size = 64, stroke = 6, showLabel = true }: AtsRingProps) {
  const id = useId();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ats-ring">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <circle cx={center} cy={center} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        className="ats-ring-arc"
      />
      {showLabel && (
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          className="ats-ring-text"
          fill={color}
          style={{ fontSize: size * 0.3 }}
        >
          {Math.round(score)}
        </text>
      )}
    </svg>
  );
}
