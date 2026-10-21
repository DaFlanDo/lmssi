import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Trash2, Eye, EyeOff, Printer,
  Sparkles, BookOpen, Loader2, Upload, X, Check,
  ChevronDown, Edit3, Search, Users, Hash, Pencil,
} from 'lucide-react';
import { apiGet, apiPost, apiDelete, apiPatch, getToken, API_BASE_URL } from '../../lib/api';
import type {
  PrintTestRead, PrintVariantRead, PrintTestQuestion,
  PrintTestQuestionsUpdate, CourseListItem,
} from '../../types';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { Navbar } from '../../components/layout/Navbar';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

// ─── Custom course select ─────────────────────────────────────────────────────

function CourseSelect({ courses, value, onChange }: {
  courses: CourseListItem[]; value: string; onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = courses.find((c) => c.id === value);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-brand focus:ring-4 focus:ring-brand/10">
        <span className={selected ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
          {selected ? selected.title : '— без привязки —'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-100 shadow-xl overflow-hidden">
            <div className="py-1 max-h-52 overflow-y-auto">
              <button type="button" onClick={() => { onChange(''); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${!value ? 'bg-brand/5 text-brand font-bold' : 'text-slate-500 hover:bg-slate-50 font-medium'}`}>
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </div>
                Без привязки {!value && <Check className="w-4 h-4 ml-auto" />}
              </button>
              {courses.map((c) => (
                <button key={c.id} type="button" onClick={() => { onChange(c.id); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${value === c.id ? 'bg-brand/5 text-brand font-bold' : 'text-slate-700 hover:bg-slate-50 font-medium'}`}>
                  <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-3.5 h-3.5 text-brand" />
                  </div>
                  <span className="truncate flex-1">{c.title}</span>
                  {value === c.id && <Check className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Progress steps ───────────────────────────────────────────────────────────

const PROGRESS_STEPS = [
  { label: 'Читаем документ...', pct: 15 },
  { label: 'Анализируем содержание...', pct: 35 },
  { label: 'Генерируем вопросы...', pct: 60 },
  { label: 'Формируем пул...', pct: 80 },
  { label: 'Финальная обработка...', pct: 95 },
];

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateForm({ courses, onClose, onCreated }: {
  courses: CourseListItem[]; onClose: () => void; onCreated: (t: PrintTestRead) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [topicHint, setTopicHint] = useState('');
  const [courseId, setCourseId] = useState('');
  const [perTest, setPerTest] = useState(10);
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [pct, setPct] = useState(0);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pickFile = (f: File) => setFile(f);

  const startProgress = () => {
    setStepIdx(0); setPct(0);
    let idx = 0;
    timerRef.current = setInterval(() => {
      idx = Math.min(idx + 1, PROGRESS_STEPS.length - 1);
      setStepIdx(idx); setPct(PROGRESS_STEPS[idx].pct);
      if (idx === PROGRESS_STEPS.length - 1 && timerRef.current) clearInterval(timerRef.current);
    }, 3500);
  };

  const stopProgress = () => { if (timerRef.current) clearInterval(timerRef.current); setPct(100); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Загрузите документ'); return; }
    setLoading(true); setError(''); startProgress();
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('topic_hint', topicHint.trim());
      fd.append('course_id', courseId);
      fd.append('questions_per_test', String(perTest));
      // title генерируется на сервере
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/print-tests/`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ detail: 'Ошибка' })); throw new Error(err.detail || 'Ошибка'); }
      stopProgress(); onCreated(await res.json());
    } catch (e: unknown) { stopProgress(); setError(e instanceof Error ? e.message : 'Ошибка'); setLoading(false); }
  };

  if (loading) {
    return (
      <div className="py-8 flex flex-col items-center gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-3xl animate-pulse" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-9 h-9 text-brand animate-bounce" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-extrabold text-slate-800 text-lg">{PROGRESS_STEPS[stepIdx].label}</p>
          <p className="text-sm text-slate-400 font-medium mt-1">AI генерирует вопросы из документа</p>
        </div>
        <div className="w-full max-w-xs">
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(to right, #2563eb, #60a5fa)' }}
              initial={{ width: '0%' }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
          </div>
          <p className="text-right text-xs font-bold text-brand mt-1">{pct}%</p>
        </div>
        <div className="flex gap-1.5">
          {PROGRESS_STEPS.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all duration-500"
              style={{ width: i === stepIdx ? '24px' : '8px', background: i <= stepIdx ? '#2563eb' : '#e2e8f0' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Документ <span className="text-slate-400 font-medium normal-case">PDF, DOCX, PPTX, TXT</span>
        </label>
        <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) pickFile(f); }}
          onClick={() => fileRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 py-7 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
            dragging ? 'border-brand bg-brand/5' : file ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-brand/40 hover:bg-slate-50/60'
          }`}>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.pptx,.txt" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) pickFile(e.target.files[0]); }} />
          {file ? (
            <>
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-emerald-700">{file.name}</p>
              <p className="text-xs text-emerald-500">{(file.size / 1024).toFixed(0)} КБ · нажмите чтобы заменить</p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Upload className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-500">Перетащите файл или нажмите</p>
              <p className="text-xs text-slate-400">PDF, DOCX, PPTX, TXT · до 10 МБ</p>
            </>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Акцент на теме <span className="text-slate-300 font-medium normal-case">(необязательно)</span>
        </label>
        <input type="text" value={topicHint} onChange={(e) => setTopicHint(e.target.value)}
          placeholder="Например: пожарная безопасность..."
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 font-medium outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all" />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Курс <span className="text-slate-300 font-medium normal-case">(для упорядочивания)</span>
        </label>
        <CourseSelect courses={courses} value={courseId} onChange={setCourseId} />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
          Вопросов в одном варианте: <span className="text-brand">{perTest}</span>
        </label>
        <input type="range" min={5} max={30} value={perTest} onChange={(e) => setPerTest(Number(e.target.value))} className="w-full accent-brand" />
        <p className="text-xs text-slate-400 mt-1">AI создаст 40–50 вопросов · каждый вариант — случайные {perTest}</p>
      </div>

      {error && <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium">{error}</div>}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
          Отмена
        </button>
        <button type="submit" className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 bg-brand hover:opacity-90 shadow-lg shadow-brand/25 transition-all">
          <Sparkles className="w-4 h-4" /> Создать
        </button>
      </div>
    </form>
  );
}

// ─── Full test view (all questions) ──────────────────────────────────────────

function FullTestView({ questions }: { questions: PrintTestQuestion[] }) {
  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100">
        Все вопросы · {questions.length}
      </p>
      {questions.map((q, qi) => (
        <div key={q.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <p className="text-sm font-bold text-slate-900 mb-3">{qi + 1}. {q.question}</p>
          <div className="space-y-1.5 pl-1">
            {q.options.map((opt, oi) => (
              <div key={oi} className={`flex items-start gap-2 text-sm px-3 py-1.5 rounded-xl ${
                oi === q.correct_index ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200' : 'text-slate-600'
              }`}>
                <span className={`font-black w-5 shrink-0 ${oi === q.correct_index ? 'text-emerald-500' : 'text-slate-400'}`}>{LETTERS[oi]}.</span>
                <span>{opt}</span>
                {oi === q.correct_index && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-auto mt-0.5" />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Batch print modal ────────────────────────────────────────────────────────

function BatchPrintModal({ test, onClose }: { test: PrintTestRead; onClose: () => void }) {
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePrint = async () => {
    setLoading(true); setError('');
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append('count', String(count));
      const res = await fetch(`${API_BASE_URL}/api/print-tests/${test.id}/batch`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ detail: 'Ошибка' })); throw new Error(err.detail); }
      const variants: PrintVariantRead[] = await res.json();
      openPrintWindow(test.title, variants);
      onClose();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Ошибка'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="px-4 py-3 rounded-2xl bg-brand/5 border border-brand/15 text-sm text-slate-600 font-medium">
        Каждый вариант получит уникальный <strong>6-символьный код</strong>.
        После проверки введите код — система покажет правильные ответы именно этого варианта.
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
          Количество вариантов: <span className="text-brand">{count}</span>
        </label>
        <input type="range" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-brand" />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>1</span><span>50</span><span>100</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Вариантов', value: count, color: '#2563eb' },
          { label: 'Вопр. в варианте', value: test.questions_per_test, color: '#059669' },
          { label: 'Всего в пуле', value: poolSize(test), color: '#7c3aed' },
        ].map((s) => (
          <div key={s.label} className="text-center px-3 py-3 rounded-2xl border border-slate-100 bg-slate-50/60">
            <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {error && <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium">{error}</div>}

      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
          Отмена
        </button>
        <button onClick={handlePrint} disabled={loading}
          className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 bg-brand hover:opacity-90 shadow-lg shadow-brand/25 disabled:opacity-60 transition-all">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Генерирую...</> : <><Printer className="w-4 h-4" /> Печатать {count} {count === 1 ? 'вариант' : count < 5 ? 'варианта' : 'вариантов'}</>}
        </button>
      </div>
    </div>
  );
}

function openPrintWindow(title: string, variants: PrintVariantRead[]) {
  const win = window.open('', '_blank');
  if (!win) return;
  const pages = variants.map((v) => `
    <div class="page">
      <div class="header">
        <h1>${title}</h1>
        <div class="code-box">
          <span class="code-label">КОД ВАРИАНТА</span>
          <span class="code-value">${v.code}</span>
        </div>
      </div>
      <div class="meta">ФИО: _____________________________________________ &nbsp;&nbsp; Дата: ___________</div>
      ${v.questions.map((q, qi) => `
        <div class="q">
          <p class="qt">${qi + 1}. ${q.question}</p>
          ${q.options.map((opt, oi) => `<div class="opt">${LETTERS[oi]}. ${opt}</div>`).join('')}
        </div>`).join('')}
    </div>`).join('');

  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Times New Roman',serif;font-size:11pt;line-height:1.5;color:#000;margin:0;padding:0}
  .page{padding:15mm 20mm;page-break-after:always}
  .page:last-child{page-break-after:avoid}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8pt;border-bottom:2px solid #000;padding-bottom:6pt}
  h1{font-size:14pt;margin:0;flex:1}
  .code-box{text-align:center;border:2px solid #000;padding:4pt 10pt;border-radius:4pt;min-width:100pt}
  .code-label{display:block;font-size:7pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.1em;color:#555}
  .code-value{display:block;font-size:20pt;font-weight:900;letter-spacing:0.15em;font-family:monospace}
  .meta{font-size:10pt;margin-bottom:12pt;color:#333}
  .q{margin-bottom:12pt;page-break-inside:avoid}
  .qt{font-weight:bold;margin-bottom:3pt}
  .opt{margin-left:12pt;margin-bottom:1pt}
  @media print{.page{padding:10mm 15mm}}
</style></head><body>${pages}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

// ─── Code lookup modal ────────────────────────────────────────────────────────

function CodeLookupModal() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<PrintVariantRead | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAnswers, setShowAnswers] = useState(true);

  const handleSearch = async () => {
    if (!code.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      setResult(await apiGet<PrintVariantRead>(`/api/print-tests/variants/${code.trim().toUpperCase()}`));
    } catch { setError('Вариант с таким кодом не найден'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      {/* Search input */}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Код варианта</label>
        <div className="flex gap-2">
          <input
            type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="A7K3P2"
            maxLength={6}
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-mono font-bold text-slate-800 tracking-widest outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-center uppercase"
          />
          <button onClick={handleSearch} disabled={loading || !code.trim()}
            className="px-5 py-3 rounded-2xl bg-brand text-white font-bold text-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-sm shadow-brand/25">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 font-semibold mt-2">{error}</p>}
      </div>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-slate-800">{result.test_title}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Код: <span className="font-mono font-black text-brand">{result.code}</span> · {result.questions.length} вопросов
              </p>
            </div>
            <button onClick={() => setShowAnswers((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                showAnswers ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
              {showAnswers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showAnswers ? 'Скрыть ответы' : 'Ответы'}
            </button>
          </div>

          <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
            {result.questions.map((q, qi) => (
              <div key={q.id} className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                <p className="text-sm font-bold text-slate-800 mb-2">{qi + 1}. {q.question}</p>
                <div className="space-y-1 pl-1">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className={`flex items-start gap-2 text-sm px-2 py-1 rounded-lg ${
                      showAnswers && oi === q.correct_index ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-500'
                    }`}>
                      <span className={`font-black w-5 shrink-0 ${showAnswers && oi === q.correct_index ? 'text-emerald-500' : 'text-slate-400'}`}>{LETTERS[oi]}.</span>
                      <span>{opt}</span>
                      {showAnswers && oi === q.correct_index && <Check className="w-3.5 h-3.5 text-emerald-500 ml-auto shrink-0 mt-0.5" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared question-pool editor (used by edit + manual create) ───────────────

function blankQuestion(): PrintTestQuestion {
  return { id: makeId(), question: '', options: ['', '', '', ''], correct_index: 0 };
}

function QuestionListEditor({ questions, setQuestions }: {
  questions: PrintTestQuestion[]; setQuestions: React.Dispatch<React.SetStateAction<PrintTestQuestion[]>>;
}) {
  const updateQ = (i: number, text: string) => setQuestions((p) => p.map((q, idx) => idx === i ? { ...q, question: text } : q));
  const updateOpt = (qi: number, oi: number, text: string) => setQuestions((p) => p.map((q, idx) =>
    idx === qi ? { ...q, options: q.options.map((o, j) => j === oi ? text : o) } : q));
  const setCorrect = (qi: number, oi: number) => setQuestions((p) => p.map((q, idx) => idx === qi ? { ...q, correct_index: oi } : q));
  const delQ = (i: number) => setQuestions((p) => p.filter((_, idx) => idx !== i));
  const addQ = () => setQuestions((p) => [...p, blankQuestion()]);
  const addOpt = (qi: number) => setQuestions((p) => p.map((q, idx) =>
    idx === qi && q.options.length < LETTERS.length ? { ...q, options: [...q.options, ''] } : q));
  const delOpt = (qi: number, oi: number) => setQuestions((p) => p.map((q, idx) => {
    if (idx !== qi || q.options.length <= 2) return q;
    const options = q.options.filter((_, j) => j !== oi);
    let correct_index = q.correct_index;
    if (oi === correct_index) correct_index = 0;
    else if (oi < correct_index) correct_index -= 1;
    return { ...q, options, correct_index };
  }));

  return (
    <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
      {questions.map((q, qi) => (
        <div key={q.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
          <div className="flex gap-3 items-start">
            <span className="w-7 h-7 rounded-xl bg-brand text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{qi + 1}</span>
            <textarea value={q.question} onChange={(e) => updateQ(qi, e.target.value)} rows={2} placeholder="Текст вопроса…"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all resize-none bg-white" />
            <button onClick={() => delQ(qi)} title="Удалить вопрос"
              className="w-7 h-7 rounded-xl hover:bg-red-50 hover:text-red-500 text-slate-300 flex items-center justify-center transition-all shrink-0 mt-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1.5 pl-10">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <button onClick={() => setCorrect(qi, oi)} title="Отметить верным"
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${q.correct_index === oi ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 hover:border-emerald-300'}`}>
                  {q.correct_index === oi && <Check className="w-3 h-3 text-white" />}
                </button>
                <span className="text-xs font-black text-slate-400 w-4">{LETTERS[oi]}.</span>
                <input value={opt} onChange={(e) => updateOpt(qi, oi, e.target.value)} placeholder={`Вариант ${LETTERS[oi]}`}
                  className={`flex-1 px-3 py-1.5 rounded-xl border text-sm font-medium outline-none transition-all ${
                    q.correct_index === oi
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                      : 'border-slate-200 bg-white text-slate-700 focus:border-brand focus:ring-2 focus:ring-brand/10'
                  }`} />
                {q.options.length > 2 && (
                  <button onClick={() => delOpt(qi, oi)} title="Удалить вариант"
                    className="w-6 h-6 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-300 flex items-center justify-center transition-all shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            {q.options.length < LETTERS.length && (
              <button onClick={() => addOpt(qi)}
                className="ml-7 text-xs font-bold text-brand hover:text-brand-dark flex items-center gap-1 transition-colors">
                <Plus className="w-3 h-3" /> Вариант
              </button>
            )}
          </div>
        </div>
      ))}
      <button onClick={addQ}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-bold text-slate-500 hover:border-brand/40 hover:text-brand hover:bg-brand/5 flex items-center justify-center gap-2 transition-all">
        <Plus className="w-4 h-4" /> Добавить вопрос
      </button>
    </div>
  );
}

// ─── Question editor (edit existing test's pool) ──────────────────────────────

function QuestionEditor({ questions: initial, onSave, onClose }: {
  questions: PrintTestQuestion[]; onSave: (q: PrintTestQuestion[]) => void; onClose: () => void;
}) {
  const [questions, setQuestions] = useState<PrintTestQuestion[]>(initial.map((q) => ({ ...q, options: [...q.options] })));

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 font-medium pb-2 border-b border-slate-100">
        Пул: <strong className="text-slate-800">{questions.length}</strong> вопросов
      </p>
      <QuestionListEditor questions={questions} setQuestions={setQuestions} />
      <div className="flex gap-3 pt-2 border-t border-slate-100">
        <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Отмена</button>
        <button onClick={() => onSave(questions)}
          className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 bg-brand hover:opacity-90 shadow-lg shadow-brand/25 transition-all">
          <Check className="w-4 h-4" /> Сохранить
        </button>
      </div>
    </div>
  );
}

// ─── Manual create form ───────────────────────────────────────────────────────

function ManualCreateForm({ courses, onClose, onCreated }: {
  courses: CourseListItem[]; onClose: () => void; onCreated: (t: PrintTestRead) => void;
}) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [courseId, setCourseId] = useState('');
  const [perTest, setPerTest] = useState(10);
  const [questions, setQuestions] = useState<PrintTestQuestion[]>([blankQuestion()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const validCount = questions.filter(
    (q) => q.question.trim() && q.options.filter((o) => o.trim()).length >= 2,
  ).length;
  const maxPer = Math.max(1, validCount);
  const effectivePer = Math.min(perTest, maxPer);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Укажите название теста'); return; }
    if (validCount < 1) { setError('Добавьте хотя бы один вопрос с текстом и минимум 2 вариантами'); return; }
    setSaving(true); setError('');
    try {
      const created = await apiPost<PrintTestRead>('/api/print-tests/manual', {
        title: title.trim(),
        topic: topic.trim(),
        course_id: courseId || null,
        questions_per_test: effectivePer,
        questions,
      });
      onCreated(created);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Название теста</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Например: Охрана труда. Вводный инструктаж"
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 font-medium outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Тема <span className="text-slate-300 font-medium normal-case">(необязательно)</span>
          </label>
          <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="Краткое описание"
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 font-medium outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Курс <span className="text-slate-300 font-medium normal-case">(необязательно)</span>
          </label>
          <CourseSelect courses={courses} value={courseId} onChange={setCourseId} />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Вопросы пула</label>
        <QuestionListEditor questions={questions} setQuestions={setQuestions} />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
          Вопросов в одном варианте: <span className="text-brand">{effectivePer}</span>
          <span className="text-slate-400 font-medium normal-case"> · в пуле годных: {validCount}</span>
        </label>
        <input type="range" min={1} max={maxPer} value={effectivePer}
          onChange={(e) => setPerTest(Number(e.target.value))} className="w-full accent-brand" />
        <p className="text-xs text-slate-400 mt-1">Каждый напечатанный вариант — случайные {effectivePer} из {validCount}</p>
      </div>

      {error && <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium">{error}</div>}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
          Отмена
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 bg-brand hover:opacity-90 shadow-lg shadow-brand/25 disabled:opacity-60 transition-all">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Сохраняю…</> : <><Check className="w-4 h-4" /> Создать тест</>}
        </button>
      </div>
    </form>
  );
}

// ─── Create modal with mode tabs (AI / manual) ────────────────────────────────

function CreateTabs({ courses, onClose, onCreated }: {
  courses: CourseListItem[]; onClose: () => void; onCreated: (t: PrintTestRead) => void;
}) {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');

  return (
    <div className="space-y-5">
      <div className="flex p-1 rounded-2xl bg-slate-100/80">
        {([
          { key: 'ai', label: 'Из документа (AI)', icon: Sparkles },
          { key: 'manual', label: 'Вручную', icon: Pencil },
        ] as const).map((t) => {
          const active = mode === t.key;
          return (
            <button key={t.key} type="button" onClick={() => setMode(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                active ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>
      {mode === 'ai'
        ? <CreateForm courses={courses} onClose={onClose} onCreated={onCreated} />
        : <ManualCreateForm courses={courses} onClose={onClose} onCreated={onCreated} />}
    </div>
  );
}

// ─── Inline title editor ──────────────────────────────────────────────────────

function InlineTitle({ test, onUpdated }: { test: PrintTestRead; onUpdated: (t: PrintTestRead) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(test.title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === test.title) { setValue(test.title); setEditing(false); return; }
    setSaving(true);
    try {
      const updated = await apiPatch<PrintTestRead>(`/api/print-tests/${test.id}/title`, { title: trimmed });
      onUpdated(updated);
    } catch { setValue(test.title); }
    finally { setSaving(false); setEditing(false); }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setValue(test.title); setEditing(false); } }}
          className="flex-1 px-2 py-1 rounded-xl border border-brand/40 ring-2 ring-brand/10 text-sm font-extrabold text-slate-800 outline-none bg-white"
          style={{ fontSize: '15px', lineHeight: '1.35' }}
        />
        {saving && <Loader2 className="w-3.5 h-3.5 text-brand animate-spin shrink-0" />}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1.5 group/title cursor-pointer" onClick={() => setEditing(true)}>
      <h3 className="font-extrabold text-slate-800 leading-snug hover:text-brand transition-colors flex-1" style={{ fontSize: '15px', lineHeight: '1.35' }}>
        {test.title}
      </h3>
      <Pencil className="w-3 h-3 text-slate-300 group-hover/title:text-brand shrink-0 mt-1 transition-colors" />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '')
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function poolSize(t: PrintTestRead) { try { return JSON.parse(t.questions_pool).length; } catch { return 0; } }
function getQuestions(t: PrintTestRead): PrintTestQuestion[] { try { return JSON.parse(t.questions_pool); } catch { return []; } }

// ─── Main page ────────────────────────────────────────────────────────────────

export function HRPrintTests() {
  const [tests, setTests] = useState<PrintTestRead[]>([]);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showLookup, setShowLookup] = useState(false);
  const [viewTest, setViewTest] = useState<PrintTestRead | null>(null);
  const [batchTest, setBatchTest] = useState<PrintTestRead | null>(null);
  const [editTest, setEditTest] = useState<PrintTestRead | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    apiGet<PrintTestRead[]>('/api/print-tests/').then(setTests).catch(console.error).finally(() => setLoading(false));
    apiGet<CourseListItem[]>('/api/courses/').then(setCourses).catch(console.error);
  }, []);

  const handleCreated = (t: PrintTestRead) => { setTests((p) => [t, ...p]); setShowCreate(false); };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); setDeleting(id);
    try { await apiDelete(`/api/print-tests/${id}`); setTests((p) => p.filter((t) => t.id !== id)); }
    catch { /* keep list as-is on failure */ } finally { setDeleting(null); }
  };

  const handleSaveEdit = async (questions: PrintTestQuestion[]) => {
    if (!editTest) return;
    try {
      const body: PrintTestQuestionsUpdate = { questions };
      const updated = await apiPatch<PrintTestRead>(`/api/print-tests/${editTest.id}`, body);
      setTests((p) => p.map((t) => t.id === updated.id ? updated : t));
      setEditTest(null);
    } catch { /* edit modal stays open on failure */ }
  };

  const courseName = (cid?: string | null) => cid ? (courses.find((c) => c.id === cid)?.title ?? null) : null;

  return (
    <PageLayout sidebar={<Sidebar />}>
      <Navbar
        title="Печатные тесты"
        subtitle="HR-панель"
        rightContent={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowLookup(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-brand/40 hover:text-brand text-slate-700 rounded-2xl font-bold transition-all text-sm">
              <Hash className="w-4 h-4" /> Проверить вариант
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-2xl font-bold shadow-lg shadow-brand/30 hover:-translate-y-0.5 transition-all text-sm">
              <Plus className="w-4 h-4" /> Создать тест
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 px-5 py-4 rounded-2xl border border-brand/15 bg-brand/5 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Загрузите документ — AI создаст <strong>40–50 вопросов</strong>.
              При печати каждый вариант получает <strong>уникальный код</strong> — введите его после проверки, чтобы увидеть правильные ответы.
            </p>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : tests.length === 0 ? (
            <EmptyState icon={FileText} title="Тестов пока нет"
              description="Загрузите документ — AI сгенерирует вопросы автоматически"
              action={{ label: 'Создать тест', onClick: () => setShowCreate(true) }} />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {tests.map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }} className="h-full">
                  <div className="group rounded-[20px] bg-white flex flex-col h-full transition-all duration-200"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(37,99,235,0.06)', border: '1px solid rgba(226,232,240,0.8)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(37,99,235,0.14), 0 2px 8px rgba(0,0,0,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(37,99,235,0.06)'; }}>
                    {/* Cover */}
                    <div className="relative overflow-hidden rounded-t-[20px] flex items-center justify-center"
                      style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)', flexShrink: 0 }}>
                      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.12) 0%, transparent 60%)' }} />
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.35)' }}>
                        <FileText className="w-7 h-7 text-white" />
                      </div>
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-black text-white" style={{ background: 'rgba(0,0,0,0.25)' }}>
                        {poolSize(t)} вопр.
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <span className="self-start text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.15)' }}>
                        {t.questions_per_test} на вариант
                      </span>
                      <InlineTitle test={t} onUpdated={(updated) => setTests((p) => p.map((x) => x.id === updated.id ? updated : x))} />
                      {t.topic && <p className="text-xs text-slate-400 font-medium line-clamp-2">{t.topic}</p>}
                      {courseName(t.course_id) && (
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3 h-3 text-brand" />
                          <span className="text-xs font-semibold text-brand truncate">{courseName(t.course_id)}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-auto pt-2">
                        <button onClick={(e) => { e.stopPropagation(); setBatchTest(t); }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white bg-brand hover:opacity-90 transition-all shadow-sm shadow-brand/25">
                          <Users className="w-3.5 h-3.5" /> Печать
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setViewTest(t); }}
                          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-brand/30 hover:text-brand hover:bg-brand/5 transition-all shrink-0"
                          title="Просмотр всех вопросов">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setEditTest(t); }}
                          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-brand/30 hover:text-brand hover:bg-brand/5 transition-all shrink-0"
                          title="Редактировать вопросы">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => handleDelete(t.id, e)} disabled={deleting === t.id}
                          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all shrink-0 disabled:opacity-40">
                          {deleting === t.id
                            ? <div className="w-3.5 h-3.5 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Создать печатный тест" maxWidth="max-w-2xl">
        <CreateTabs courses={courses} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      </Modal>

      <Modal isOpen={!!viewTest} onClose={() => setViewTest(null)} title={viewTest?.title ?? ''} maxWidth="max-w-2xl">
        {viewTest && <FullTestView questions={getQuestions(viewTest)} />}
      </Modal>

      <Modal isOpen={!!batchTest} onClose={() => setBatchTest(null)} title="Пакетная печать" maxWidth="max-w-md">
        {batchTest && <BatchPrintModal test={batchTest} onClose={() => setBatchTest(null)} />}
      </Modal>

      <Modal isOpen={!!editTest} onClose={() => setEditTest(null)} title="Редактировать вопросы" maxWidth="max-w-2xl">
        {editTest && <QuestionEditor questions={getQuestions(editTest)} onSave={handleSaveEdit} onClose={() => setEditTest(null)} />}
      </Modal>

      <Modal isOpen={showLookup} onClose={() => setShowLookup(false)} title="Проверить вариант по коду" maxWidth="max-w-xl">
        <CodeLookupModal />
      </Modal>
    </PageLayout>
  );
}
