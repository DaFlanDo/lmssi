import type React from 'react';

interface Props {
  className?: string;
  style?: React.CSSProperties;
}

/** Один shimmer-блок в фирменном синеватом тоне. */
export function Skeleton({ className = '', style }: Props) {
  return <div className={`skeleton ${className}`} style={style} />;
}

/** Каркас дашборда под bento-сетку — мягкая замена fullPage-спиннеру. */
export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-2">
      <Skeleton className="md:col-span-8 rounded-[28px] min-h-[280px]" />
      <Skeleton className="md:col-span-4 rounded-[28px] min-h-[280px]" />
      <Skeleton className="md:col-span-6 rounded-[28px] h-56" />
      <Skeleton className="md:col-span-6 rounded-[28px] h-56" />
    </div>
  );
}
