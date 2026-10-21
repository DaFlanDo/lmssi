import { useState, useEffect } from 'react';
import { CheckCircle2, CheckSquare, RotateCcw } from 'lucide-react';
import { apiGet, apiPost } from '../../../lib/api';
import type { QuizAttemptRead } from '../../../types';

// ── Single-question quiz block (in lesson) ────────────────────────────────────
export function InteractiveQuiz({
  block, lessonId, onComplete,
}: { block: { id: string; content: string }; lessonId: string; onComplete?: () => void }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [result, setResult] = useState<QuizAttemptRead | null>(null);
  const [loading, setLoading] = useState(false);
  const [prevAttempt, setPrevAttempt] = useState<QuizAttemptRead | null>(null);

  let quiz = { question: '', options: [] as string[], correctIndex: 0 };
  try { if (block.content) quiz = JSON.parse(block.content); } catch { /* keep defaults on malformed JSON */ }

  useEffect(() => {
    apiGet<QuizAttemptRead[]>(`/api/progress/quiz/${lessonId}`)
      .then((attempts) => {
        const mine = attempts.find((a) => a.block_id === block.id);
        if (mine) setPrevAttempt(mine);
      })
      .catch(() => {});
  }, [lessonId, block.id]);

  const attempt = result ?? prevAttempt;
  const showResult = attempt !== null;

  const handleSubmit = async () => {
    if (selectedIdx === null) return;
    setLoading(true);
    try {
      const res = await apiPost<QuizAttemptRead>('/api/progress/quiz', {
        lesson_id: lessonId,
        block_id: block.id,
        answers: { 0: selectedIdx },
      });
      setResult(res);
      if (res.passed && onComplete) onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Сброс для повторной попытки после неверного ответа (бэкенд принимает новые попытки).
  const handleRetry = () => {
    setResult(null);
    setPrevAttempt(null);
    setSelectedIdx(null);
  };

  return (
    <div className="my-10 p-8 bg-emerald-50 rounded-[28px] border border-emerald-100 shadow-inner relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />
      <h4 className="text-emerald-800 font-bold mb-6 flex items-center gap-2 relative z-10">
        <CheckSquare className="w-5 h-5" /> Проверка знаний
      </h4>
      <p className="text-emerald-900 font-black text-xl mb-8 relative z-10">
        {quiz.question || 'Вопрос не задан'}
      </p>
      <div className="space-y-3 relative z-10">
        {quiz.options.map((opt: string, i: number) => {
          if (!opt) return null;
          const isSelected = selectedIdx === i;
          const isCorrect = attempt ? i === quiz.correctIndex : false;
          const isWrong = attempt && attempt.answers[0] === i && !attempt.passed;

          let cls = 'w-full text-left px-6 py-4 rounded-2xl border-2 transition-all font-bold text-[15px] ';
          if (!showResult) {
            cls += isSelected
              ? 'bg-brand border-brand text-white shadow-lg'
              : 'bg-white border-emerald-100 hover:border-brand hover:shadow-md text-emerald-900 hover:-translate-y-0.5';
          } else if (isCorrect) {
            cls += 'bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]';
          } else if (isWrong) {
            cls += 'bg-red-500 border-red-600 text-white shadow-lg shadow-red-500/30';
          } else {
            cls += 'bg-white border-slate-100 text-slate-400 opacity-50';
          }

          return (
            <button key={i} disabled={showResult} onClick={() => setSelectedIdx(i)} className={cls}>
              {opt}
              {showResult && isCorrect && <CheckCircle2 className="w-5 h-5 float-right" />}
            </button>
          );
        })}
      </div>
      {!showResult && (
        <button
          onClick={handleSubmit}
          disabled={selectedIdx === null || loading}
          className="mt-6 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
        >
          {loading ? 'Проверяем...' : 'Ответить'}
        </button>
      )}
      {showResult && (
        <div className="mt-6 flex flex-wrap items-center gap-3 relative z-10">
          <div className={`p-4 rounded-2xl font-bold text-sm ${attempt?.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
            {attempt?.passed ? '✅ Верно! Отличная работа!' : '❌ Неверно — попробуйте ещё раз.'}
          </div>
          {!attempt?.passed && (
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-emerald-200 text-emerald-700 rounded-2xl font-bold hover:border-brand hover:text-brand transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Попробовать снова
            </button>
          )}
        </div>
      )}
    </div>
  );
}
