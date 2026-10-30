// Свободно-стоящий знак LMSSI.
// Концепция: две восходящие ленты-пламени, перетекающие из глубокого синего в золото,
// с венчающей искрой — символом просвещения. Без контейнера, без рамки.

interface Props {
  size?: number;
  className?: string;
}

export function BrandMark({ size = 36, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 36 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="lumen-flame" x1="0" y1="1" x2="0.6" y2="0">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="55%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
        <linearGradient id="lumen-flame-2" x1="0" y1="1" x2="0.4" y2="0">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id="lumen-spark" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#eff6ff" />
          <stop offset="40%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.4" />
        </radialGradient>
        <filter id="lumen-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      {/* Задняя лента — широкое перо пламени */}
      <path
        d="M11 40 Q 6 28 12 18 Q 18 8 22 4 Q 22 14 19 22 Q 16 30 18 40 Z"
        fill="url(#lumen-flame)"
        opacity="0.95"
      />

      {/* Передняя лента — изящный язык, перетекающий в золото */}
      <path
        d="M19 40 Q 20 30 24 22 Q 28 14 26 6 Q 32 14 30 24 Q 28 32 24 40 Z"
        fill="url(#lumen-flame-2)"
        opacity="0.92"
      />

      {/* Венчающая искра — свечение */}
      <circle cx="24" cy="5" r="3.4" fill="url(#lumen-spark)" filter="url(#lumen-glow)" />
      <circle cx="24" cy="5" r="1.6" fill="#eff6ff" />

      {/* Тонкое основание-блик */}
      <ellipse cx="18" cy="40.5" rx="9" ry="1.1" fill="#1e3a8a" opacity="0.18" />
    </svg>
  );
}