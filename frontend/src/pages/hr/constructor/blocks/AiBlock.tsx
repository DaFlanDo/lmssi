import { Bot } from 'lucide-react';
import { useRef, useEffect } from 'react';

interface Props {
  content: string;
  onChange: (v: string) => void;
}

export function AiBlock({ content, onChange }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [content]);

  return (
    <div className="w-full p-[2px] bg-gradient-to-r from-amber-200/50 to-amber-100/10 rounded-[30px] my-6">
      <div className="bg-white/90 backdrop-blur-md rounded-[28px] p-8 shadow-[0_10px_40px_-10px_rgba(245,158,11,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 text-white rounded-[16px] flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-lg">ИИ-Наставник (Диалог)</h4>
            <p className="text-sm text-slate-500 font-medium">Студент сможет общаться с ботом</p>
          </div>
        </div>

        <div className="relative z-10">
          <span className="absolute top-3 left-4 text-amber-500 font-bold text-xs uppercase tracking-wider">Превромпт</span>
          <textarea
            ref={ref}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Укажите роль и правила для бота..."
            rows={1}
            className="w-full pt-9 pb-4 px-4 rounded-2xl border border-amber-200 bg-amber-50/30 outline-none focus:border-amber-400 focus:bg-white transition-colors font-medium text-amber-900 resize-none overflow-hidden"
          />
        </div>
      </div>
    </div>
  );
}
