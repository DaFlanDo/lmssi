import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Props {
  count?: number;
}

// Палитра конфетти — строго из дизайн-системы.
const COLORS = ['#2563eb', '#60a5fa', '#059669', '#d4af37', '#7c3aed'];

// Детерминированный псевдослучайный разброс (чистая функция — без Math.random в рендере).
const scatter = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Лёгкое одноразовое конфетти. Появляется только в момент монтирования
 * (например, на экране «все курсы пройдены»). Уважает reduced-motion.
 */
export function Confetti({ count = 26 }: Props) {
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const pieces = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        left: scatter(i + 1) * 100,
        size: 5 + scatter(i + 2) * 5,
        color: COLORS[i % COLORS.length],
        drift: (scatter(i + 3) - 0.5) * 120,
        rotate: (scatter(i + 4) - 0.5) * 540,
        delay: scatter(i + 5) * 0.35,
        duration: 1.4 + scatter(i + 6) * 0.8,
        round: scatter(i + 7) > 0.5,
      })),
    [count],
  );

  if (reduce) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-[5]">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: -16,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.round ? '9999px' : '2px',
          }}
          initial={{ y: 0, x: 0, opacity: 0, rotate: 0 }}
          animate={{ y: 360, x: p.drift, opacity: [0, 1, 1, 0], rotate: p.rotate }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: [0.4, 0.1, 0.6, 1],
            times: [0, 0.1, 0.7, 1],
          }}
        />
      ))}
    </div>
  );
}
