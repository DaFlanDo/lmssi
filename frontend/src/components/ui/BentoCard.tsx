import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type React from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  noHover?: boolean;
}

export function BentoCard({ children, className = '', style, onClick, noHover }: Props) {
  return (
    <motion.div
      className={`bento-card ${className}`}
      whileHover={noHover ? undefined : { y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      onClick={onClick}
      style={{ ...(onClick ? { cursor: 'pointer' } : {}), ...style }}
    >
      {children}
    </motion.div>
  );
}
