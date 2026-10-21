import { Layers, FileText, Blocks, ClipboardList, Sparkles, Plus, ArrowRight } from 'lucide-react';

interface Props {
  onUseTemplate: () => void;
  onAddModule: () => void;
}

const STEPS = [
  { Icon: Layers, title: 'Модуль', desc: 'Крупный раздел курса', color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
  { Icon: FileText, title: 'Урок', desc: 'Шаг внутри модуля', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
  { Icon: Blocks, title: 'Блоки', desc: 'Текст, видео, задания', color: '#0891b2', bg: 'rgba(8,145,178,0.08)' },
  { Icon: ClipboardList, title: 'Тест', desc: 'Влияет на сертификат', color: '#059669', bg: 'rgba(5,150,105,0.08)' },
];

/** Первый экран нового курса: объясняет иерархию и предлагает старт из шаблона. */
export function CourseOnboarding({ onUseTemplate, onAddModule }: Props) {
  return (
    <div className="bento-card bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center h-full px-8 py-10 text-center overflow-y-auto">
      <div className="max-w-xl w-full">
        <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-5">
          <Sparkles className="w-7 h-7 text-brand" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Соберём ваш курс</h2>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed">
          Курс состоит из вложенных частей. Начните с шаблона — он создаст готовый
          каркас, который останется наполнить.
        </p>

        {/* Hierarchy explainer */}
        <div className="flex items-stretch justify-center gap-2 mb-9 flex-wrap">
          {STEPS.map(({ Icon, title, desc, color, bg }, i) => (
            <div key={title} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-2 w-28">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: bg }}>
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-700">{title}</div>
                  <div className="text-[11px] font-medium text-slate-400 leading-tight">{desc}</div>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 mb-7" />
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={onUseTemplate}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand text-white font-bold shadow-lg shadow-brand/25 hover:-translate-y-0.5 transition-all"
          >
            <Sparkles className="w-4 h-4" /> Создать из шаблона
          </button>
          <button
            onClick={onAddModule}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold hover:border-brand/40 hover:text-brand transition-all"
          >
            <Plus className="w-4 h-4" /> Пустой модуль
          </button>
        </div>
        <p className="text-[12px] text-slate-400 font-medium mt-5">
          Всё сохраняется автоматически. Опубликовать курс можно в любой момент сверху.
        </p>
      </div>
    </div>
  );
}
