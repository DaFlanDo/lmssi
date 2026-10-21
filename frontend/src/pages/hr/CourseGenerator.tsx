import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Upload, FileText, Sparkles, Settings2,
  CheckCircle2, AlertCircle, Loader2, X, Wand2, BookOpen, ClipboardList,
  ChevronDown, Trophy,
} from 'lucide-react';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { getToken, API_BASE_URL as API_BASE } from '../../lib/api';

type Step = 'upload' | 'params' | 'generating' | 'done' | 'error';

type Depth = 'short' | 'medium' | 'full';

// Пресеты объёма курса: пользователь выбирает «полноту», а modules/lessons
// подбираются под капотом. Удобнее, чем крутить два ползунка вручную.
const DEPTH_PRESETS: Record<Depth, {
  label: string;
  desc: string;
  modules: number;
  lessons: number;
}> = {
  short:  { label: 'Короткий', desc: 'Только суть — для небольших материалов', modules: 2, lessons: 2 },
  medium: { label: 'Средний',  desc: 'Сбалансированный курс на каждый день',   modules: 3, lessons: 3 },
  full:   { label: 'Объёмный', desc: 'Подробно, с разбором деталей',           modules: 5, lessons: 4 },
};

// Стиль изложения и уровень аудитории — расширенные настройки генерации.
type Tone = 'official' | 'friendly' | 'concise';
type Level = 'novice' | 'experienced';

const TONE_OPTIONS: { key: Tone; label: string }[] = [
  { key: 'official', label: 'Официальный' },
  { key: 'friendly', label: 'Дружелюбный' },
  { key: 'concise',  label: 'Лаконичный' },
];
const LEVEL_OPTIONS: { key: Level; label: string }[] = [
  { key: 'novice',      label: 'Новичок' },
  { key: 'experienced', label: 'Опытный' },
];

// Русское склонение: plural(5, 'урок', 'урока', 'уроков') → 'уроков'
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

interface JobStatus {
  job_id: string;
  status: 'running' | 'done' | 'error';
  done: number;
  total: number;
  message: string;
  course_id: string | null;
  error: string | null;
}

export function CourseGenerator() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Параметры генерации
  const [depth, setDepth] = useState<Depth>('medium');
  const [includeQuiz, setIncludeQuiz] = useState(true);
  const [titleHint, setTitleHint] = useState('');

  // Расширенные настройки
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [includeFinalTest, setIncludeFinalTest] = useState(false);
  const [tone, setTone] = useState<Tone>('official');
  const [level, setLevel] = useState<Level>('novice');

  // Оценка вместимости материала (сколько уроков реально раскрыть из файла)
  const [capacity, setCapacity] = useState<{ chars: number; maxLessons: number } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const modulesCount = DEPTH_PRESETS[depth].modules;
  const lessonsPerModule = DEPTH_PRESETS[depth].lessons;
  const selectedLessons = modulesCount * lessonsPerModule;
  // Материала заметно меньше выбранного объёма → курс может получиться с водой
  const overReach = !!capacity && selectedLessons > capacity.maxLessons;

  const [errorMsg, setErrorMsg] = useState('');
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Остановка опроса при размонтировании
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── Файл ───────────────────────────────────────────────────────────────────
  const handleFile = (f: File) => {
    const okExt = ['.pdf', '.docx', '.pptx', '.txt'].some((e) => f.name.toLowerCase().endsWith(e));
    if (!okExt) {
      setErrorMsg('Поддерживаются только PDF, DOCX, PPTX, TXT');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setErrorMsg('Файл больше 50 МБ');
      return;
    }
    setErrorMsg('');
    setFile(f);
    setStep('params');
    analyzeCapacity(f);
  };

  // Оцениваем объём материала, чтобы подсказать подходящую полноту курса.
  // Не блокирует генерацию: если не вышло — просто не показываем подсказку.
  const analyzeCapacity = async (f: File) => {
    setCapacity(null);
    setAnalyzing(true);
    try {
      const form = new FormData();
      form.append('file', f);
      const res = await fetch(`${API_BASE}/api/generation/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      if (!res.ok) return;
      const data = await res.json();
      setCapacity({ chars: data.chars, maxLessons: data.suggested_max_lessons });
    } catch {
      // тихо игнорируем — подсказка опциональна
    } finally {
      setAnalyzing(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  // ── Опрос статуса ──────────────────────────────────────────────────────────
  const startPolling = (jobId: string) => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/generation/status/${jobId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) return;
        const status: JobStatus = await res.json();
        setJobStatus(status);
        if (status.status === 'done') {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep('done');
        } else if (status.status === 'error') {
          if (pollRef.current) clearInterval(pollRef.current);
          setErrorMsg(status.error || 'Неизвестная ошибка');
          setStep('error');
        }
      } catch {
        // сеть недоступна — продолжаем пробовать
      }
    };
    pollRef.current = setInterval(poll, 1500);
    poll(); // сразу первый запрос
  };

  // ── Генерация ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!file) return;
    setStep('generating');
    setErrorMsg('');
    setJobStatus(null);

    const form = new FormData();
    form.append('file', file);
    form.append('modules_count', String(modulesCount));
    form.append('lessons_per_module', String(lessonsPerModule));
    form.append('include_quiz', String(includeQuiz));
    form.append('tone', tone);
    form.append('level', level);
    form.append('include_final_test', String(includeFinalTest));
    if (titleHint) form.append('course_title_hint', titleHint);

    try {
      const res = await fetch(`${API_BASE}/api/generation/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Ошибка запуска генерации');
      }
      const { job_id } = await res.json();
      startPolling(job_id);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Неизвестная ошибка');
      setStep('error');
    }
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <PageLayout sidebar={<Sidebar />}>
      <div className="px-6 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/hr/courses')}
          className="w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-600 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand" />
            AI-генератор курса
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Загрузите документ — получите готовую структуру курса с уроками и тестами
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-12">
        <div className="max-w-3xl mx-auto">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {(['upload', 'params', 'generating', 'done'] as const).map((s, i) => {
              const active =
                (s === 'upload' && step === 'upload') ||
                (s === 'params' && step === 'params') ||
                (s === 'generating' && step === 'generating') ||
                (s === 'done' && step === 'done');
              const passed =
                (s === 'upload' && step !== 'upload') ||
                (s === 'params' && (step === 'generating' || step === 'done')) ||
                (s === 'generating' && step === 'done');
              return (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                      active
                        ? 'bg-brand text-white shadow-md shadow-brand/30 scale-110'
                        : passed
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {passed ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  {i < 3 && (
                    <div
                      className={`flex-1 h-[2px] rounded-full ${
                        passed ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {/* ── UPLOAD ── */}
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-16 text-center transition-all bg-white/80 backdrop-blur-xl ${
                    dragOver
                      ? 'border-brand bg-brand/5 scale-[1.01]'
                      : 'border-slate-300 hover:border-brand hover:bg-brand/5'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.pptx,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                      e.target.value = '';
                    }}
                  />
                  <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-brand/10 flex items-center justify-center">
                    <Upload className="w-10 h-10 text-brand" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">
                    Перетащите документ сюда
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mb-4">
                    или нажмите, чтобы выбрать файл
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {['PDF', 'DOCX', 'PPTX', 'TXT'].map((ext) => (
                      <span
                        key={ext}
                        className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-md"
                      >
                        {ext}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-4">
                    Максимум 50 МБ
                  </p>
                </div>

                {errorMsg && (
                  <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {errorMsg}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── PARAMS ── */}
            {step === 'params' && file && (
              <motion.div
                key="params"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                {/* File chip */}
                <div className="flex items-center gap-3 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl p-4">
                  <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      {(file.size / 1024).toFixed(1)} КБ
                    </p>
                  </div>
                  <button
                    onClick={() => { setFile(null); setCapacity(null); setStep('upload'); }}
                    className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Settings card */}
                <div className="bento-card bg-white/90 backdrop-blur-xl p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Settings2 className="w-5 h-5 text-brand" />
                    <h3 className="text-lg font-black text-slate-800">Параметры генерации</h3>
                  </div>

                  <div className="space-y-5">
                    {/* Title hint */}
                    <div>
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                        Подсказка по названию (опционально)
                      </label>
                      <input
                        type="text"
                        value={titleHint}
                        onChange={(e) => setTitleHint(e.target.value)}
                        placeholder="Например: Техника безопасности на производстве"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 font-medium text-slate-700 transition"
                      />
                    </div>

                    {/* Объём курса */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                          Объём курса
                        </label>
                        {analyzing ? (
                          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                            <Loader2 className="w-3 h-3 animate-spin" /> оцениваем материал…
                          </span>
                        ) : capacity ? (
                          <span className="text-[11px] font-semibold text-slate-400">
                            в файле хватает примерно на {capacity.maxLessons}{' '}
                            {plural(capacity.maxLessons, 'урок', 'урока', 'уроков')}
                          </span>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-3 gap-2.5">
                        {(Object.keys(DEPTH_PRESETS) as Depth[]).map((key) => {
                          const p = DEPTH_PRESETS[key];
                          const active = depth === key;
                          const tooBig = !!capacity && p.modules * p.lessons > capacity.maxLessons;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setDepth(key)}
                              className={`relative text-left rounded-2xl border-2 p-3.5 transition-all ${
                                active
                                  ? 'border-brand bg-brand/5 shadow-sm shadow-brand/10'
                                  : 'border-slate-200 bg-white hover:border-brand/40 hover:bg-slate-50'
                              }`}
                            >
                              {active && (
                                <CheckCircle2 className="absolute top-2.5 right-2.5 w-4 h-4 text-brand" />
                              )}
                              <p className={`font-black text-sm mb-1 ${active ? 'text-brand' : 'text-slate-800'}`}>
                                {p.label}
                              </p>
                              <p className="text-[11px] leading-snug font-medium text-slate-500 mb-2 min-h-[28px]">
                                {p.desc}
                              </p>
                              <span className={`inline-block text-[10px] font-bold tabular-nums ${tooBig ? 'text-amber-500' : 'text-slate-400'}`}>
                                до {p.modules * p.lessons} уроков
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {overReach && (
                        <p className="mt-2.5 flex items-start gap-1.5 text-[11px] font-semibold text-amber-600">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                          Материала в файле маловато для этого объёма — лишние уроки система урежет сама,
                          чтобы не лить воду. Курс может выйти короче выбранного.
                        </p>
                      )}
                    </div>

                    {/* Quiz toggle */}
                    <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                      <div>
                        <p className="font-bold text-slate-800">Тесты по модулям</p>
                        <p className="text-xs text-slate-500 font-medium">
                          Проверочный тест в конце каждого модуля
                        </p>
                      </div>
                      <div
                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                          includeQuiz ? 'bg-brand' : 'bg-slate-300'
                        }`}
                        onClick={(e) => { e.preventDefault(); setIncludeQuiz((v) => !v); }}
                      >
                        <div
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                            includeQuiz ? 'translate-x-[22px]' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                      <input type="checkbox" checked={includeQuiz} onChange={() => {}} className="hidden" />
                    </label>

                    {/* Расширенные настройки (сворачиваемый блок) */}
                    <div className="rounded-2xl border border-slate-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowAdvanced((v) => !v)}
                        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition"
                      >
                        <span className="flex items-center gap-2 text-sm font-black text-slate-700">
                          <Settings2 className="w-4 h-4 text-slate-400" />
                          Расширенные настройки
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {showAdvanced && (
                        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-slate-100">
                          {/* Final test toggle */}
                          <label className="flex items-center justify-between gap-3 cursor-pointer pt-3">
                            <div>
                              <p className="flex items-center gap-1.5 font-bold text-slate-800">
                                <Trophy className="w-4 h-4 text-amber-500" />
                                Итоговый тест по всему курсу
                              </p>
                              <p className="text-xs text-slate-500 font-medium">
                                6 вопросов по всем модулям в конце курса
                              </p>
                            </div>
                            <div
                              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                                includeFinalTest ? 'bg-brand' : 'bg-slate-300'
                              }`}
                              onClick={(e) => { e.preventDefault(); setIncludeFinalTest((v) => !v); }}
                            >
                              <div
                                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                  includeFinalTest ? 'translate-x-[22px]' : 'translate-x-0.5'
                                }`}
                              />
                            </div>
                          </label>

                          {/* Стиль изложения */}
                          <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                              Стиль изложения
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {TONE_OPTIONS.map((o) => (
                                <button
                                  key={o.key}
                                  type="button"
                                  onClick={() => setTone(o.key)}
                                  className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                                    tone === o.key
                                      ? 'border-brand bg-brand/5 text-brand'
                                      : 'border-slate-200 text-slate-600 hover:border-brand/40'
                                  }`}
                                >
                                  {o.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Уровень аудитории */}
                          <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                              Уровень аудитории
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {LEVEL_OPTIONS.map((o) => (
                                <button
                                  key={o.key}
                                  type="button"
                                  onClick={() => setLevel(o.key)}
                                  className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                                    level === o.key
                                      ? 'border-brand bg-brand/5 text-brand'
                                      : 'border-slate-200 text-slate-600 hover:border-brand/40'
                                  }`}
                                >
                                  {o.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Estimate */}
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                      <p className="text-sm text-amber-800 font-semibold">
                        ✨ Будет сгенерировано: {modulesCount} модулей, {modulesCount * lessonsPerModule} уроков
                        {includeFinalTest && ' + итоговый тест'}
                      </p>
                      <p className="text-xs text-amber-700/80 font-medium mt-1">
                        Это займёт от 30 секунд до 2 минут — модель работает над каждым уроком отдельно
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  className="w-full py-4 rounded-2xl bg-brand hover:bg-brand-dark text-white font-black text-base shadow-lg shadow-brand/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <Wand2 className="w-5 h-5" />
                  Сгенерировать курс
                </button>
              </motion.div>
            )}

            {/* ── GENERATING ── */}
            {step === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bento-card bg-white/90 backdrop-blur-xl p-10"
              >
                {/* Spinning icon */}
                <div className="flex justify-center mb-7">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full bg-brand/15 animate-ping" />
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center shadow-xl shadow-brand/30">
                      <Loader2 className="w-10 h-10 text-white animate-spin" />
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-black text-slate-800 mb-1 text-center">
                  Генерируем курс...
                </h3>

                {/* Current step message */}
                <p className="text-sm font-semibold text-brand text-center mb-6 min-h-[20px] truncate px-4">
                  {jobStatus?.message || 'Запускаем генерацию...'}
                </p>

                {/* Progress bar */}
                {jobStatus && jobStatus.total > 0 ? (
                  <div className="mb-5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Прогресс</span>
                      <span className="text-sm font-black text-brand">
                        {jobStatus.done} / {jobStatus.total}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-brand to-brand-dark rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(jobStatus.done / jobStatus.total) * 100}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ) : (
                  /* Indeterminate shimmer while total not yet known */
                  <div className="mb-5">
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full w-1/3 bg-gradient-to-r from-brand/40 via-brand to-brand/40 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" />
                    </div>
                  </div>
                )}

                {/* Step log — last 4 messages */}
                <GeneratingLog status={jobStatus} />
              </motion.div>
            )}

            {/* ── DONE ── */}
            {step === 'done' && jobStatus?.course_id && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bento-card bg-white/90 backdrop-blur-xl p-10 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Курс готов!</h3>
                <p className="text-slate-500 font-medium mb-6">
                  Сгенерировано {jobStatus.done} элементов
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => navigate('/hr/courses')}
                    className="px-6 py-3 rounded-2xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    К списку курсов
                  </button>
                  <button
                    onClick={() => navigate(`/hr/courses/${jobStatus.course_id}/edit`)}
                    className="px-6 py-3 rounded-2xl bg-brand text-white font-bold shadow-lg shadow-brand/30 hover:-translate-y-0.5 transition"
                  >
                    Открыть в конструкторе
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── ERROR ── */}
            {step === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bento-card bg-white/90 backdrop-blur-xl p-10 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">
                  Что-то пошло не так
                </h3>
                <p className="text-red-600 font-semibold mb-6 max-w-md mx-auto">
                  {errorMsg || 'Не удалось сгенерировать курс'}
                </p>
                <button
                  onClick={() => setStep('params')}
                  className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-bold hover:-translate-y-0.5 transition"
                >
                  Попробовать снова
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageLayout>
  );
}

// ── Лог шагов генерации ───────────────────────────────────────────────────────
function GeneratingLog({ status }: { status: JobStatus | null }) {
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    if (!status?.message) return;
    // Показываем только сообщения об уроках и тестах, не системные
    const msg = status.message;
    if (msg.startsWith('Урок') || msg.startsWith('Тест')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- накапливаем лог по мере смены status.message
      setLog((prev) => {
        if (prev[prev.length - 1] === msg) return prev;
        return [...prev.slice(-4), msg];  // храним последние 5
      });
    }
  }, [status?.message]);

  if (log.length === 0) {
    return (
      <p className="text-xs text-slate-400 font-medium text-center italic mt-2">
        ИИ читает документ и выстраивает структуру...
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      {log.map((entry, i) => {
        const isTest = entry.startsWith('Тест');
        const isLast = i === log.length - 1;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: isLast ? 1 : 0.45, x: 0 }}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold ${
              isLast
                ? isTest
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-brand/8 text-brand'
                : 'text-slate-400'
            }`}
          >
            {isLast ? (
              isTest ? <ClipboardList className="w-3.5 h-3.5 shrink-0" /> : <BookOpen className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            )}
            <span className="truncate">{entry}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
