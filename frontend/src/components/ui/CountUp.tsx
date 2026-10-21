import type React from 'react';
import { useCountUp } from '../../hooks/useCountUp';

interface Props {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Целочисленный счётчик с эффектом «набегания». */
export function CountUp({ value, duration, suffix = '', className, style }: Props) {
  const v = useCountUp(value, duration);
  return (
    <span className={className} style={style}>
      {Math.round(v)}
      {suffix}
    </span>
  );
}
