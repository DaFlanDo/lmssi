import { useId } from 'react';
import { motion } from 'framer-motion';

interface Props {
  percent: number;
  size?: number;
  strokeWidth?: number;
  /** Явный цвет переопределяет авто-цвет (синий → emerald при 100%). */
  color?: string;
}

export function ProgressRing({ percent, size = 120, strokeWidth = 10, color }: Props) {
  const clamped = Math.min(100, Math.max(0, percent));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (clamped / 100) * circumference;
  const done = clamped >= 100;
  const id = useId();

  // Авто-палитра: фирменный синий, emerald на 100% — обе из дизайн-системы.
  const from = color ?? (done ? '#059669' : '#2563eb');
  const to = color ?? (done ? '#34d399' : '#60a5fa');
  const glow = done ? 'rgba(5,150,105,0.32)' : 'rgba(37,99,235,0.28)';

  return (
    <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="transparent"
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="transparent"
        stroke={`url(#ring-${id})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        style={{ filter: `drop-shadow(0 0 5px ${glow})` }}
      />
    </svg>
  );
}
