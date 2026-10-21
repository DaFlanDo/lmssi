import { CheckSquare, Square, ArrowUp, ArrowDown } from 'lucide-react';
import type { QuizAnswer } from '../../../types';
import type { ServedQuestion } from './testUtils';

// ── Один вопрос в режиме прохождения ──────────────────────────────────────────
export function TakingQuestion({ s, answer, onAnswer }: {
  s: ServedQuestion;
  answer: QuizAnswer | undefined;
  onAnswer: (val: QuizAnswer) => void;
}) {
  // single / boolean — выбор одного варианта
  if (s.type === 'single' || s.type === 'boolean') {
    return (
      <div className="space-y-3">
        {s.optionOrder.map((origIdx, displayIdx) => {
          const isSelected = answer === origIdx;
          return (
            <button
              key={origIdx}
              onClick={() => onAnswer(origIdx)}
              className={`w-full text-left px-6 py-4 rounded-2xl border-2 transition-all font-semibold text-[15px] ${
                isSelected
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/25 scale-[1.01]'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50'
              }`}
            >
              <span className={`inline-flex w-6 h-6 rounded-full border-2 mr-3 items-center justify-center text-xs font-black ${
                isSelected ? 'border-white bg-white/20 text-white' : 'border-slate-300 text-slate-400'}`}>
                {String.fromCharCode(65 + displayIdx)}
              </span>
              {s.q.options[origIdx]}
            </button>
          );
        })}
      </div>
    );
  }

  // multiple — несколько вариантов
  if (s.type === 'multiple') {
    const chosen = Array.isArray(answer) ? (answer as number[]) : [];
    const toggle = (origIdx: number) => {
      const set = new Set(chosen);
      if (set.has(origIdx)) set.delete(origIdx); else set.add(origIdx);
      onAnswer([...set].sort((a, b) => a - b));
    };
    return (
      <div className="space-y-3">
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Выберите все верные варианты</p>
        {s.optionOrder.map((origIdx) => {
          const isSelected = chosen.includes(origIdx);
          return (
            <button
              key={origIdx}
              onClick={() => toggle(origIdx)}
              className={`w-full text-left px-6 py-4 rounded-2xl border-2 transition-all font-semibold text-[15px] flex items-center gap-3 ${
                isSelected
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50'
              }`}
            >
              {isSelected ? <CheckSquare className="w-5 h-5 shrink-0" /> : <Square className="w-5 h-5 shrink-0 text-slate-300" />}
              {s.q.options[origIdx]}
            </button>
          );
        })}
      </div>
    );
  }

  // short — текстовый ответ
  if (s.type === 'short') {
    return (
      <input
        type="text"
        value={typeof answer === 'string' ? answer : ''}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder="Введите ответ..."
        className="w-full px-6 py-4 rounded-2xl border-2 border-slate-200 focus:border-emerald-400 outline-none font-semibold text-[15px] text-slate-700 placeholder-slate-300 transition-colors"
      />
    );
  }

  // ordering — расстановка по порядку (стрелки)
  const order = Array.isArray(answer) ? (answer as number[]) : s.optionOrder;
  const move = (pos: number, dir: -1 | 1) => {
    const tgt = pos + dir;
    if (tgt < 0 || tgt >= order.length) return;
    const arr = [...order];
    [arr[pos], arr[tgt]] = [arr[tgt], arr[pos]];
    onAnswer(arr);
  };
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">Расставьте в правильном порядке</p>
      {order.map((origIdx, pos) => (
        <div key={origIdx} className="flex items-center gap-3 px-5 py-3.5 rounded-2xl border-2 border-slate-200 bg-white">
          <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-600 text-sm font-black flex items-center justify-center shrink-0">
            {pos + 1}
          </span>
          <span className="flex-1 font-semibold text-slate-700 text-[15px]">{s.q.options[origIdx]}</span>
          <div className="flex flex-col">
            <button onClick={() => move(pos, -1)} disabled={pos === 0}
              className="w-7 h-6 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-20 flex items-center justify-center">
              <ArrowUp className="w-4 h-4" />
            </button>
            <button onClick={() => move(pos, 1)} disabled={pos === order.length - 1}
              className="w-7 h-6 rounded-lg hover:bg-slate-100 text-slate-400 disabled:opacity-20 flex items-center justify-center">
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
