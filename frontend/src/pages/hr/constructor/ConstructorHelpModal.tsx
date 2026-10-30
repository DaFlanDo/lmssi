import { Layers, FileText, Blocks, ClipboardList, Award } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { BLOCK_TYPES } from './blockTypes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const HIERARCHY = [
  { Icon: Layers, title: 'Модуль', desc: 'Крупный раздел курса', color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
  { Icon: FileText, title: 'Урок', desc: 'Шаг внутри модуля', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
  { Icon: Blocks, title: 'Блоки', desc: 'Наполнение урока', color: '#0891b2', bg: 'rgba(8,145,178,0.08)' },
  { Icon: ClipboardList, title: 'Тест', desc: 'Проверка знаний', color: '#059669', bg: 'rgba(5,150,105,0.08)' },
];

export function ConstructorHelpModal({ isOpen, onClose }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Как собрать курс" maxWidth="max-w-2xl">
      <div className="max-h-[70vh] overflow-y-auto pr-1 -mr-1 space-y-7">

        {/* Hierarchy */}
        <section>
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Из чего состоит курс</h3>
          <div className="flex items-stretch gap-2 flex-wrap">
            {HIERARCHY.map(({ Icon, title, desc, color, bg }) => (
              <div key={title} className="flex-1 min-w-[120px] flex items-center gap-3 rounded-2xl border border-slate-100 px-3 py-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-700 leading-tight">{title}</div>
                  <div className="text-[11px] font-medium text-slate-400 leading-tight">{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[13px] text-slate-500 font-medium mt-3 leading-relaxed">
            Курс = модули → уроки → блоки. К любому модулю можно добавить тест, а в конце — итоговый тест.
          </p>
        </section>

        {/* Block types */}
        <section>
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Блоки урока</h3>
          <div className="space-y-2">
            {BLOCK_TYPES.map(({ type, label, Icon, desc, formative }) => (
              <div key={type} className="flex items-start gap-3 rounded-2xl border border-slate-100 px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800">{label}</span>
                    {formative && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        не влияет на сертификат
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-slate-500 font-medium leading-snug mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tests */}
        <section>
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Тесты и сертификат</h3>
          <div className="flex items-start gap-3 rounded-2xl border border-brand/15 bg-brand/5 px-4 py-3">
            <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0 mt-0.5">
              <Award className="w-5 h-5 text-brand" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-800">Тест модуля и итоговый тест</div>
              <p className="text-[13px] text-slate-600 font-medium leading-snug mt-0.5">
                Обязательные проверки. Чтобы получить сертификат, сотрудник должен пройти их с заданным
                порогом. В отличие от «Задания» и «Открытого ответа» внутри урока, эти тесты
                <span className="font-bold text-slate-700"> засчитываются</span>.
              </p>
            </div>
          </div>
        </section>

        <p className="text-[12px] text-slate-400 font-medium pt-1">
          Подсказка: всё сохраняется автоматически. Кнопка «Превью» показывает урок глазами сотрудника.
        </p>
      </div>
    </Modal>
  );
}
