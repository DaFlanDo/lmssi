// Универсальный логотип LMSSI.
// Концепция: раскрытая книга (знание) + восходящий лучик/искра над ней (рост, прогресс).
// Помещены в круг с градиентной заливкой — академично, премиально, узнаваемо.

interface Props {
  size?: number;
  className?: string;
  variant?: 'gradient' | 'navy' | 'mono';
  withGlow?: boolean;
}

export function BrandLogo({
  size = 40,
  className = '',
  variant = 'gradient',
  withGlow = true,
}: Props) {
  const gradients = {
    gradient: ['#3b82f6', '#1d4ed8'],
    navy: ['#1e3a8a', '#172554'],
    mono: ['#1e293b', '#0f172a'],
  };
  const [c1, c2] = gradients[variant];
  const id = `brand-${variant}`;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
        boxShadow: withGlow
          ? variant === 'gradient'
            ? `0 ${size * 0.1}px ${size * 0.45}px rgba(37,99,235,0.42)`
            : variant === 'navy'
              ? `0 ${size * 0.1}px ${size * 0.45}px rgba(30,58,138,0.4)`
              : `0 ${size * 0.1}px ${size * 0.4}px rgba(15,23,42,0.3)`
          : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Глянцевый блик в углу */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: '40%',
          bottom: '55%',
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, transparent 100%)',
          borderTopLeftRadius: 'inherit',
          pointerEvents: 'none',
        }}
      />

      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <defs>
          <linearGradient id={`${id}-spark`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* Восходящая искра / луч / квинтэссенция знания */}
        <path
          d="M16 3 L18 9 L24 8 L19.5 12 L23 17 L16 13 L9 17 L12.5 12 L8 8 L14 9 Z"
          fill={`url(#${id}-spark)`}
          opacity="0.95"
        />

        {/* Раскрытая книга — основание */}
        <path
          d="M4 21 Q 10 19 16 22 Q 22 19 28 21 L 28 27 Q 22 25 16 28 Q 10 25 4 27 Z"
          fill="#ffffff"
          opacity="0.96"
        />
        {/* Корешок книги */}
        <line
          x1="16"
          y1="22"
          x2="16"
          y2="28"
          stroke={c2}
          strokeWidth="0.8"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}