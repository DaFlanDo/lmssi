import { Layers } from 'lucide-react';

interface Props {
  fullPage?: boolean;
  label?: string;
}

export function LoadingSpinner({ fullPage = false, label = 'Загрузка...' }: Props) {
  const content = (
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center shadow-xl shadow-brand/30 animate-pulse">
        <Layers className="w-6 h-6 text-white" />
      </div>
      <p className="text-slate-500 font-bold text-sm tracking-wide">{label}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center py-16">
      {content}
    </div>
  );
}
