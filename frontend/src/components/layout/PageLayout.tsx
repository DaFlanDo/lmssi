import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  sidebar?: ReactNode;
}

export function PageLayout({ children, sidebar }: Props) {
  return (
    <div className="flex h-screen overflow-hidden text-slate-800 relative" style={{ background: '#F4F7FF' }}>
      {sidebar}

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        {children}
      </main>
    </div>
  );
}
