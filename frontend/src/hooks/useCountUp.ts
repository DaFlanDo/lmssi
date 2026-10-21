import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Плавно «набегающее» число от текущего значения к target.
 * Уважает prefers-reduced-motion (мгновенно ставит финальное значение).
 */
export function useCountUp(target: number, duration = 1000): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const current = useRef(prefersReducedMotion() ? target : 0);

  useEffect(() => {
    // duration 0 → первый же кадр выставит финальное значение (reduced-motion).
    const effDuration = prefersReducedMotion() ? 0 : duration;
    let raf = 0;
    const from = current.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = effDuration > 0 ? Math.min(1, (now - start) / effDuration) : 1;
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const v = from + (target - from) * eased;
      current.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
