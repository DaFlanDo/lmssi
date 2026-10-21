import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  value: string | number;
  label: string;
  iconBg?: string;
  iconColor?: string;
}

export function StatsCard({ icon: Icon, value, label, iconBg = 'bg-brand-light', iconColor = 'text-brand' }: Props) {
  return (
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div>
        <div className="text-2xl font-black text-slate-800">{value}</div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}
