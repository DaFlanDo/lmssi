import { Info, AlertTriangle, Lightbulb } from 'lucide-react';
import { useRef, useEffect } from 'react';

type CalloutVariant = 'info' | 'warning' | 'tip';

interface CalloutData {
  variant: CalloutVariant;
  text: string;
}

interface Props {
  content: string;
  onChange: (v: string) => void;
}

const VARIANTS: {
  key: CalloutVariant;
  label: string;
  Icon: React.ElementType;
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  labelColor: string;
}[] = [
  {
    key: 'info',
    label: 'Важно',
    Icon: Info,
    bg: 'rgba(37,99,235,0.05)',
    border: 'rgba(37,99,235,0.18)',
    iconBg: 'rgba(37,99,235,0.1)',
    iconColor: '#2563eb',
    labelColor: '#1e40af',
  },
  {
    key: 'warning',
    label: 'Внимание',
    Icon: AlertTriangle,
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.25)',
    iconBg: 'rgba(245,158,11,0.12)',
    iconColor: '#d97706',
    labelColor: '#b45309',
  },
  {
    key: 'tip',
    label: 'Совет',
    Icon: Lightbulb,
    bg: 'rgba(16,185,129,0.05)',
    border: 'rgba(16,185,129,0.2)',
    iconBg: 'rgba(16,185,129,0.1)',
    iconColor: '#059669',
    labelColor: '#047857',
  },
];

function parse(content: string): CalloutData {
  try {
    if (content) return JSON.parse(content);
  } catch { /* keep defaults on malformed JSON */ }
  return { variant: 'info', text: '' };
}

export function CalloutBlock({ content, onChange }: Props) {
  const data = parse(content);
  const active = VARIANTS.find((v) => v.key === data.variant) ?? VARIANTS[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [data.text]);

  const update = (patch: Partial<CalloutData>) =>
    onChange(JSON.stringify({ ...data, ...patch }));

  return (
    <div
      className="rounded-2xl p-5 my-2"
      style={{ background: active.bg, border: `1.5px solid ${active.border}` }}
    >
      {/* Variant switcher */}
      <div className="flex items-center gap-2 mb-4">
        {VARIANTS.map((v) => (
          <button
            key={v.key}
            onClick={() => update({ variant: v.key })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={
              data.variant === v.key
                ? { background: v.iconBg, color: v.labelColor, border: `1.5px solid ${v.border}` }
                : { background: 'transparent', color: '#94a3b8', border: '1.5px solid transparent' }
            }
          >
            <v.Icon className="w-3.5 h-3.5" />
            {v.label}
          </button>
        ))}
      </div>

      {/* Text area */}
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: active.iconBg }}
        >
          <active.Icon className="w-4 h-4" style={{ color: active.iconColor }} />
        </div>
        <textarea
          ref={textareaRef}
          value={data.text}
          onChange={(e) => update({ text: e.target.value })}
          placeholder={
            data.variant === 'info'
              ? 'Важная информация для сотрудника...'
              : data.variant === 'warning'
              ? 'Предупреждение или ограничение...'
              : 'Полезный совет или лайфхак...'
          }
          rows={1}
          className="flex-1 resize-none overflow-hidden bg-transparent outline-none text-sm font-medium leading-relaxed placeholder-slate-300"
          style={{ color: active.labelColor }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
          }}
        />
      </div>
    </div>
  );
}

// Read-only view used by StudentCourse
export function CalloutView({ content }: { content: string }) {
  const data = parse(content);
  if (!data.text) return null;
  const v = VARIANTS.find((x) => x.key === data.variant) ?? VARIANTS[0];

  return (
    <div
      className="rounded-2xl px-5 py-4 my-2 flex items-start gap-3"
      style={{ background: v.bg, border: `1.5px solid ${v.border}` }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: v.iconBg }}
      >
        <v.Icon className="w-4 h-4" style={{ color: v.iconColor }} />
      </div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: v.labelColor }}>
          {v.label}
        </div>
        <p className="text-sm font-medium leading-relaxed text-slate-700 whitespace-pre-wrap">{data.text}</p>
      </div>
    </div>
  );
}
