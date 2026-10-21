import { CheckCircle2, XCircle } from 'lucide-react';
import type { QuizAnswer } from '../../../types';
import { gradeClient, QUESTION_TYPE_LABEL } from './testUtils';
import type { ServedQuestion } from './testUtils';

// ── Разбор одного вопроса ─────────────────────────────────────────────────────
export function ReviewQuestion({ s, index, userAnswer }: {
  s: ServedQuestion;
  index: number;
  userAnswer: QuizAnswer | undefined;
}) {
  const { q, type } = s;
  const isCorrect = gradeClient(q, userAnswer);

  return (
    <div className={`p-5 rounded-2xl border-2 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs font-bold text-slate-400">Вопрос {index + 1}</p>
        <span className="text-[10px] font-bold text-slate-400 bg-white/70 px-2 py-0.5 rounded-full">{QUESTION_TYPE_LABEL[type]}</span>
        {isCorrect
          ? <span className="ml-auto text-[11px] font-black text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Верно</span>
          : <span className="ml-auto text-[11px] font-black text-red-500 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Неверно</span>}
      </div>
      <p className="font-bold text-slate-800 mb-3">{q.question}</p>

      {/* short */}
      {type === 'short' ? (
        <div className="space-y-1.5 text-sm font-semibold">
          <div className={`px-4 py-2.5 rounded-xl ${isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
            Ваш ответ: {typeof userAnswer === 'string' && userAnswer.trim() ? userAnswer : <span className="italic opacity-70">пусто</span>}
          </div>
          {!isCorrect && (
            <div className="px-4 py-2.5 rounded-xl bg-emerald-100 text-emerald-800">
              Правильно: {(q.correctText ?? '').split('|').map((x) => x.trim()).filter(Boolean).join(', ')}
            </div>
          )}
        </div>
      ) : type === 'ordering' ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase mb-1.5">Ваш порядок</p>
            <div className="space-y-1">
              {(Array.isArray(userAnswer) ? userAnswer : []).map((origIdx, pos) => {
                const ok = origIdx === pos;
                return (
                  <div key={pos} className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                    <span className="font-black">{pos + 1}.</span> {q.options[origIdx]}
                  </div>
                );
              })}
            </div>
          </div>
          {!isCorrect && (
            <div>
              <p className="text-[11px] font-bold text-emerald-500 uppercase mb-1.5">Правильный порядок</p>
              <div className="space-y-1">
                {q.options.map((opt, pos) => (
                  <div key={pos} className="px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-2">
                    <span className="font-black">{pos + 1}.</span> {opt}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* single / boolean / multiple */
        <div className="space-y-1.5">
          {q.options.map((opt, optIdx) => {
            const correctSet = type === 'multiple'
              ? new Set((q.correctIndices ?? []).map(Number))
              : new Set([Number(q.correctIndex)]);
            const userSet = type === 'multiple'
              ? new Set((Array.isArray(userAnswer) ? userAnswer : []).map(Number))
              : new Set([Number(userAnswer)]);
            const isRight = correctSet.has(optIdx);
            const isUserChoice = userSet.has(optIdx);
            return (
              <div
                key={optIdx}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                  isRight ? 'bg-emerald-100 text-emerald-800'
                  : isUserChoice ? 'bg-red-100 text-red-700 line-through opacity-70'
                  : 'text-slate-500 opacity-60'
                }`}
              >
                {isRight && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                {isUserChoice && !isRight && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                {opt}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
