import { useRef, useEffect, useState } from 'react';
import { PenLine, Sparkles, Send, RotateCcw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { apiGet, apiPost } from '../../../../lib/api';
import type { OpenAnswerResult } from '../../../../types';

interface OpenAnswerData {
  prompt: string;
  criteria: string;
}

function parse(content: string): OpenAnswerData {
  try {
    if (content) {
      const d = JSON.parse(content);
      return { prompt: d.prompt ?? '', criteria: d.criteria ?? '' };
    }
  } catch { /* keep defaults on malformed JSON */ }
  return { prompt: '', criteria: '' };
}

// ── Editor (HR constructor) ────────────────────────────────────────────────────
interface EditorProps {
  content: string;
  onChange: (v: string) => void;
}

function AutoTextarea({
  value, onChange, placeholder, className,
}: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className={`resize-none overflow-hidden ${className || ''}`}
    />
  );
}

export function OpenAnswerBlock({ content, onChange }: EditorProps) {
  const data = parse(content);
  const update = (patch: Partial<OpenAnswerData>) =>
    onChange(JSON.stringify({ ...data, ...patch }));

  return (
    <div className="w-full py-6 px-8 bg-amber-50/50 rounded-[28px] border border-amber-100 my-4 shadow-inner relative">
      <div className="absolute -top-3 -right-3 w-20 h-20 bg-amber-100 rounded-full blur-2xl opacity-50 pointer-events-none" />

      <div className="flex items-center gap-3 mb-5 pl-1 relative z-10">
        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <PenLine className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <div className="text-amber-800 font-bold leading-tight flex items-center gap-2">
            Открытый ответ
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" /> ИИ-проверка
            </span>
          </div>
          <div className="text-xs text-slate-400 font-medium">Сотрудник пишет развёрнутый ответ, ИИ оценивает понимание</div>
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5 pl-1">Задание / вопрос</label>
          <AutoTextarea
            value={data.prompt}
            onChange={(v) => update({ prompt: v })}
            placeholder="Напр.: Объясните своими словами, зачем нужна техника безопасности на производстве."
            className="w-full p-4 rounded-xl border border-amber-200/60 bg-white font-semibold text-slate-800 placeholder-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-shadow shadow-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1.5 pl-1">
            Критерии оценивания <span className="font-medium text-slate-400">(необязательно, скрыто от сотрудника)</span>
          </label>
          <AutoTextarea
            value={data.criteria}
            onChange={(v) => update({ criteria: v })}
            placeholder="Что должен содержать хороший ответ: ключевые тезисы, термины, примеры..."
            className="w-full p-4 rounded-xl border border-amber-100 bg-white font-medium text-slate-700 placeholder-slate-300 text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-shadow shadow-sm"
          />
        </div>
      </div>
    </div>
  );
}

// ── View (student, read-only task with AI grading) ─────────────────────────────
function ScoreBadge({ score, passed }: { score: number; passed: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-black ${
        passed ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
      }`}
    >
      {passed ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      {score}/100
    </div>
  );
}

export function OpenAnswerView({ block, lessonId }: { block: { id: string; content: string }; lessonId: string }) {
  const data = parse(block.content);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<OpenAnswerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    apiGet<OpenAnswerResult | null>(`/api/ai/open-answer/${block.id}`)
      .then((prev) => {
        if (prev) {
          setResult(prev);
          setAnswer(prev.answer);
        }
      })
      .catch(() => { /* нет прошлой попытки — норм */ });
  }, [block.id]);

  const submit = async () => {
    const text = answer.trim();
    if (text.length < 10) {
      setError('Ответ слишком короткий — раскройте мысль подробнее (минимум 10 символов).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiPost<OpenAnswerResult>('/api/ai/evaluate-answer', {
        lesson_id: lessonId,
        block_id: block.id,
        answer: text,
      });
      setResult(res);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось проверить ответ');
    } finally {
      setLoading(false);
    }
  };

  const showResult = result !== null && !editing;

  return (
    <div className="my-10 p-8 rounded-[28px] border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white shadow-inner relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-200/40 rounded-full blur-3xl pointer-events-none" />

      <h4 className="text-amber-800 font-bold mb-2 flex items-center gap-2 relative z-10">
        <PenLine className="w-5 h-5" /> Задание с открытым ответом
        <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
          <Sparkles className="w-3 h-3" /> Проверяет ИИ
        </span>
      </h4>
      <p className="text-amber-900 font-black text-xl mb-6 relative z-10">
        {data.prompt || 'Раскройте тему урока своими словами.'}
      </p>

      {!showResult ? (
        <div className="relative z-10">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={loading}
            rows={5}
            placeholder="Напишите развёрнутый ответ своими словами..."
            className="w-full px-5 py-4 rounded-2xl border-2 border-amber-200 bg-white outline-none focus:border-amber-400 transition-colors font-medium text-slate-700 placeholder-slate-300 resize-y disabled:opacity-60"
          />
          {error && <p className="text-red-500 text-sm font-bold mt-2">{error}</p>}
          <button
            onClick={submit}
            disabled={loading || !answer.trim()}
            className="mt-4 flex items-center gap-2 px-7 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> ИИ проверяет...</> : <><Send className="w-4 h-4" /> Отправить на проверку</>}
          </button>
        </div>
      ) : (
        <div className="relative z-10">
          {/* Submitted answer */}
          <div className="p-4 rounded-2xl bg-white border border-amber-100 mb-4">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ваш ответ</div>
            <p className="text-slate-700 font-medium whitespace-pre-wrap text-sm leading-relaxed">{result!.answer}</p>
          </div>

          {/* AI verdict */}
          <div
            className={`p-5 rounded-2xl border-2 ${
              result!.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-500">
                <Sparkles className="w-4 h-4 text-amber-500" /> Оценка ИИ
              </div>
              <ScoreBadge score={result!.score} passed={result!.passed} />
            </div>
            <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{result!.feedback}</p>
          </div>

          <button
            onClick={() => { setEditing(true); setError(''); }}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold hover:border-amber-400 hover:text-amber-600 transition-all text-sm"
          >
            <RotateCcw className="w-4 h-4" /> Ответить заново
          </button>
        </div>
      )}
    </div>
  );
}
