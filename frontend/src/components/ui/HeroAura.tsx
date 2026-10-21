import { useEffect, useRef } from 'react';
import type React from 'react';

interface Props {
  /** Тон подложки: фирменный синий или emerald (например, «всё пройдено»). */
  tone?: 'blue' | 'emerald';
  /** Световое пятно, следящее за курсором. */
  spotlight?: boolean;
}

const TONES = {
  blue: {
    gradient: 'linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 40%, #2563eb 70%, #3b82f6 100%)',
    glowA: 'radial-gradient(circle, rgba(147,197,253,0.35) 0%, transparent 70%)',
    glowB: 'radial-gradient(circle, rgba(30,64,175,0.6) 0%, transparent 70%)',
  },
  emerald: {
    gradient: 'linear-gradient(145deg, #047857 0%, #059669 45%, #10b981 100%)',
    glowA: 'radial-gradient(circle, rgba(167,243,208,0.35) 0%, transparent 70%)',
    glowB: 'radial-gradient(circle, rgba(6,95,70,0.6) 0%, transparent 70%)',
  },
} as const;

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")";

/**
 * Подложка hero-карточки: базовый градиент + два медленно «дышащих»
 * световых пятна + лёгкое пятно за курсором + текстура шума.
 * Всё в фирменной палитре, движение медленное (16–20с) и тонкое.
 */
export function HeroAura({ tone = 'blue', spotlight = true }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const t = TONES[tone];

  useEffect(() => {
    if (!spotlight) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        el.style.setProperty('--mx', `${x}%`);
        el.style.setProperty('--my', `${y}%`);
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [spotlight]);

  return (
    <div
      ref={ref}
      className="absolute inset-0 rounded-[28px] overflow-hidden"
      style={{ '--mx': '72%', '--my': '18%' } as React.CSSProperties}
    >
      {/* base gradient */}
      <div style={{ position: 'absolute', inset: 0, background: t.gradient }} />

      {/* breathing glows */}
      <div
        className="hero-blob"
        style={{ top: '-60px', right: '-40px', width: 380, height: 380, background: t.glowA }}
      />
      <div
        className="hero-blob hero-blob-delay"
        style={{ bottom: '-60px', left: '10%', width: 260, height: 260, background: t.glowB }}
      />

      {/* cursor spotlight */}
      {spotlight && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(440px circle at var(--mx) var(--my), rgba(255,255,255,0.12), transparent 60%)',
            transition: 'background 0.2s ease-out',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* noise texture */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: NOISE, opacity: 0.5 }} />
    </div>
  );
}
