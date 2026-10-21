// Универсальный академический орнамент — лавровая ветвь.
// Используется в углах сертификата и тематических карточках.
export function LaurelOrnament({
  className = '',
  flip = false,
  size = 90,
}: { className?: string; flip?: boolean; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      style={{ transform: flip ? 'scaleX(-1)' : undefined }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="laurel-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e3c46a" />
          <stop offset="50%" stopColor="#c9a227" />
          <stop offset="100%" stopColor="#8a6508" />
        </linearGradient>
      </defs>
      {/* Стебель — изящная дуга */}
      <path
        d="M28 100 Q 38 75 50 55 Q 62 35 78 22"
        stroke="url(#laurel-grad)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Листья по обе стороны стебля */}
      {Array.from({ length: 8 }).map((_, i) => {
        const t = i / 7;
        // Точка на кривой (приближённо по контрольным точкам)
        const x = 28 + (78 - 28) * t + Math.sin(t * Math.PI) * 6;
        const y = 100 - (100 - 22) * t;
        // Угол касательной
        const angle = -55 - t * 25;
        return (
          <g key={i}>
            {/* Внешний (большой) лист */}
            <ellipse
              cx={x + Math.cos((angle + 90) * Math.PI / 180) * 9}
              cy={y + Math.sin((angle + 90) * Math.PI / 180) * 9}
              rx="4"
              ry="10"
              fill="url(#laurel-grad)"
              transform={`rotate(${angle + 90} ${x + Math.cos((angle + 90) * Math.PI / 180) * 9} ${y + Math.sin((angle + 90) * Math.PI / 180) * 9})`}
              opacity="0.92"
            />
            {/* Внутренний (малый) лист */}
            <ellipse
              cx={x + Math.cos((angle - 90) * Math.PI / 180) * 8}
              cy={y + Math.sin((angle - 90) * Math.PI / 180) * 8}
              rx="3.5"
              ry="9"
              fill="url(#laurel-grad)"
              transform={`rotate(${angle - 90} ${x + Math.cos((angle - 90) * Math.PI / 180) * 8} ${y + Math.sin((angle - 90) * Math.PI / 180) * 8})`}
              opacity="0.78"
            />
          </g>
        );
      })}
      {/* Декоративная звезда у основания */}
      <circle cx="28" cy="100" r="2.2" fill="url(#laurel-grad)" />
    </svg>
  );
}