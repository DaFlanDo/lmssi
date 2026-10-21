import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  PlayCircle,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  PanelLeftOpen,
  PanelLeftClose,
  PanelRightOpen,
  PanelRightClose,
  Video,
  FileText,
  CheckSquare,
  Square,
  Bot,
  Send,
  Sparkles,
  ClipboardList,
  Trophy,
  XCircle,
  RotateCcw,
  Eye,
  ShieldAlert,
  Award,
  Clock,
  Lock,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
} from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../../lib/api';
import type {
  CourseRead, CourseProgressRead, LessonRead, QuizAttemptRead,
  LessonCompleteResponse, ModuleTest, ModuleTestAttemptRead,
  QuizQuestion, QuestionType, ModuleTestContent, QuizAnswer,
} from '../../types';
import { CertificateAwardedModal } from '../../components/certificate/CertificateAwardedModal';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { CalloutView } from '../hr/constructor/blocks/CalloutBlock';
import { ChecklistView } from '../hr/constructor/blocks/ChecklistBlock';
import { OpenAnswerView } from '../hr/constructor/blocks/OpenAnswerBlock';

// ── Active item union ─────────────────────────────────────────────────────────
type ActiveItem =
  | { kind: 'lesson'; id: string }
  | { kind: 'test';   id: string };

const TEST_TYPE_LABELS: Record<string, string> = {
  module: 'Тест по модулю',
  block:  'Тест по блоку',
  final:  'Итоговый тест',
};

// ── Single-question quiz block (in lesson) ────────────────────────────────────
function InteractiveQuiz({
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

// ── Media block (с трекингом просмотра для гейта видео) ───────────────────────
const ytVideoId = (url: string): string | null => {
  if (!url.includes('youtu')) return null;
  return url.includes('v=') ? url.split('v=')[1].split('&')[0] : (url.split('/').pop() || null);
};

const isPlayableVideo = (url: string): boolean =>
  !!ytVideoId(url) || /\.(mp4|webm|ogg)$/i.test(url);

// Ленивая загрузка YouTube IFrame API (один раз на страницу)
let ytApiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    const w = window as unknown as { YT?: { Player: unknown }; onYouTubeIframeAPIReady?: () => void };
    if (w.YT && w.YT.Player) { resolve(); return; }
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}

function YouTubeWatch({ videoId, onWatch, noSeek }: { videoId: string; onWatch?: (frac: number) => void; noSeek?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onWatchRef = useRef(onWatch);
  const noSeekRef = useRef(noSeek);
  useEffect(() => { onWatchRef.current = onWatch; }, [onWatch]);
  useEffect(() => { noSeekRef.current = noSeek; }, [noSeek]);
  useEffect(() => {
    type Pl = {
      getCurrentTime: () => number; getDuration: () => number;
      seekTo: (s: number, allow: boolean) => void; destroy: () => void;
    };
    let player: (Pl & { pauseVideo?: () => void; playVideo?: () => void }) | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    let maxWatched = 0;
    const SEEK_TOLERANCE = 1.5;

    const handleVisibility = () => {
      if (document.hidden) {
        player?.pauseVideo?.();
      } else {
        player?.playVideo?.();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    loadYouTubeApi().then(() => {
      if (cancelled || !hostRef.current) return;
      const YT = (window as unknown as { YT: { Player: new (el: HTMLElement, opts: unknown) => Pl } }).YT;
      player = new YT.Player(hostRef.current, {
        videoId,
        events: {
          onReady: () => {
            poll = setInterval(() => {
              if (!player) return;
              const dur = player.getDuration();
              const t = player.getCurrentTime();
              if (dur <= 0) return;
              if (noSeekRef.current && t > maxWatched + SEEK_TOLERANCE) {
                player.seekTo(maxWatched, true);
              } else if (t <= maxWatched + SEEK_TOLERANCE) {
                maxWatched = Math.max(maxWatched, t);
              }
              onWatchRef.current?.(maxWatched / dur);
            }, 500);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      document.removeEventListener('visibilitychange', handleVisibility);
      try { player?.destroy(); } catch { /* noop */ }
    };
  }, [videoId]);

  return (
    <div className="mt-6">
      <div className="w-full aspect-video rounded-[24px] shadow-xl overflow-hidden bg-black">
        <div ref={hostRef} className="w-full h-full" />
      </div>
      {noSeek && (
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mt-2">
          <Lock className="w-3 h-3" /> Перемотка вперёд недоступна — ролик нужно досмотреть
        </p>
      )}
    </div>
  );
}

function MediaBlock({ block, onWatch }: { block: { id?: string; content: string }; onWatch?: (frac: number) => void }) {
  const url = block.content || '';
  const vid = ytVideoId(url);
  const maxWatchedRef = useRef(0);
  const SEEK_TOLERANCE = 1.5;

  if (vid) {
    // Если трекинг не нужен — лёгкий iframe; иначе плеер с IFrame API и блокировкой перемотки.
    if (!onWatch) {
      return <iframe className="w-full aspect-video rounded-[24px] mt-6 shadow-xl" src={`https://www.youtube.com/embed/${vid}`} allowFullScreen />;
    }
    return <YouTubeWatch videoId={vid} onWatch={onWatch} noSeek />;
  }
  if (url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i))
    return <img src={url} alt="Media" className="w-full rounded-[24px] mt-6 max-h-[500px] object-cover shadow-xl" />;
  if (url.match(/\.(mp4|webm|ogg)$/i))
    return (
      <div className="mt-6">
        <video
          src={url}
          controls
          onTimeUpdate={onWatch ? (e) => {
            const v = e.currentTarget;
            if (!v.duration) return;
            if (v.currentTime <= maxWatchedRef.current + SEEK_TOLERANCE) {
              maxWatchedRef.current = Math.max(maxWatchedRef.current, v.currentTime);
            }
            onWatch(maxWatchedRef.current / v.duration);
          } : undefined}
          onSeeking={onWatch ? (e) => {
            // Прыжок вперёд дальше досмотренного — возвращаем назад.
            const v = e.currentTarget;
            if (v.currentTime > maxWatchedRef.current + SEEK_TOLERANCE) {
              v.currentTime = maxWatchedRef.current;
            }
          } : undefined}
          className="w-full rounded-[24px] aspect-video shadow-xl bg-black"
        />
        {onWatch && (
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mt-2">
            <Lock className="w-3 h-3" /> Перемотка вперёд недоступна — ролик нужно досмотреть
          </p>
        )}
      </div>
    );
  return (
    <div className="my-10 p-3 bg-slate-50/80 rounded-[28px] border border-slate-100 flex items-center justify-center h-[350px]">
      <PlayCircle className="w-16 h-16 text-slate-300" />
    </div>
  );
}

// ── Test helpers (банк вопросов, перемешивание, клиентский грейдинг) ───────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const normShort = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/ё/g, 'е');
const qTypeOf = (q: QuizQuestion): QuestionType => q.type ?? 'single';

// Верен ли канонический ответ (зеркалит бэкенд) — для подсветки разбора.
function gradeClient(q: QuizQuestion, ans: QuizAnswer | undefined): boolean {
  const t = qTypeOf(q);
  if (t === 'multiple') {
    const chosen = new Set((Array.isArray(ans) ? ans : []).map(Number));
    const correct = new Set((q.correctIndices ?? []).map(Number));
    return correct.size > 0 && chosen.size === correct.size && [...correct].every((i) => chosen.has(i));
  }
  if (t === 'short') {
    const accepted = (q.correctText ?? '').split('|').map((x) => x.trim()).filter(Boolean);
    return accepted.length > 0 && accepted.some((a) => normShort(a) === normShort(ans));
  }
  if (t === 'ordering') {
    const order = Array.isArray(ans) ? ans.map(Number) : [];
    return order.length === q.options.length && order.every((v, i) => v === i);
  }
  return Number(ans) === Number(q.correctIndex);
}

interface ServedQuestion {
  q: QuizQuestion;
  type: QuestionType;
  optionOrder: number[];   // исходные индексы вариантов в порядке показа
}

type TestCfg = Required<Pick<ModuleTestContent,
  'questions' | 'pass_threshold' | 'questions_per_attempt' | 'shuffle_questions' |
  'shuffle_options' | 'time_limit_min' | 'show_correct_answers'>>;

function parseTestContent(raw: string): TestCfg {
  try {
    const d = JSON.parse(raw);
    return {
      questions: d.questions ?? [],
      pass_threshold: d.pass_threshold ?? 70,
      questions_per_attempt: d.questions_per_attempt ?? 0,
      shuffle_questions: d.shuffle_questions ?? false,
      shuffle_options: d.shuffle_options ?? false,
      time_limit_min: d.time_limit_min ?? 0,
      show_correct_answers: d.show_correct_answers ?? true,
    };
  } catch {
    return {
      questions: [], pass_threshold: 70, questions_per_attempt: 0,
      shuffle_questions: false, shuffle_options: false, time_limit_min: 0, show_correct_answers: true,
    };
  }
}

const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  single: 'Один ответ', multiple: 'Несколько ответов', boolean: 'Верно / неверно',
  short: 'Короткий ответ', ordering: 'Расставьте по порядку',
};

const fmtTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ── Module test player ────────────────────────────────────────────────────────
function ModuleTestPlayer({ test, onCertificate, onPassed }: {
  test: ModuleTest;
  onCertificate?: (certNumber: string) => void;
  onPassed?: () => void;
}) {
  type Phase = 'idle' | 'taking' | 'result';

  const cfg = parseTestContent(test.content);
  const [phase, setPhase] = useState<Phase>('idle');
  const [served, setServed] = useState<ServedQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});
  const [attempt, setAttempt] = useState<ModuleTestAttemptRead | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingPrev, setLoadingPrev] = useState(true);
  // Прокторинг
  const [violations, setViolations] = useState(0);
  const [warned, setWarned] = useState(false);
  // Таймер: оставшиеся секунды (null = без лимита)
  const [remaining, setRemaining] = useState<number | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (phase !== 'taking') return;
    let last = 0;
    const register = () => {
      const now = Date.now();
      if (now - last < 800) return;  // дедуп blur+visibilitychange
      last = now;
      setViolations((v) => v + 1);
      setWarned(true);
    };
    const onVisibility = () => { if (document.hidden) register(); };
    window.addEventListener('blur', register);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', register);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [phase]);

  // Загружаем историю попыток
  useEffect(() => {
    apiGet<ModuleTestAttemptRead[]>(`/api/progress/module-test/${test.id}/attempts`)
      .then((res) => {
        setAttemptCount(res.length);
        if (res.length > 0) {
          setAttempt(res[0]); // первая = самая свежая (DESC)
          setPhase('result');
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPrev(false));
  }, [test.id]);

  const isAnswered = (s: ServedQuestion): boolean => {
    const a = answers[s.q.id];
    if (s.type === 'multiple') return Array.isArray(a) && a.length > 0;
    if (s.type === 'short') return typeof a === 'string' && a.trim().length > 0;
    if (s.type === 'ordering') return true;   // всегда есть стартовый порядок
    return typeof a === 'number';
  };

  const answered = served.filter(isAnswered).length;
  const total = served.length;

  const handleSubmit = async (auto = false) => {
    if (submittingRef.current) return;
    if (!auto && answered < total) return;
    submittingRef.current = true;
    setLoading(true);
    setRemaining(null);
    try {
      const res = await apiPost<ModuleTestAttemptRead>('/api/progress/module-test', {
        test_id: test.id,
        answers,
        question_ids: served.map((s) => s.q.id),
        focus_violations: violations,
      });
      setAttempt(res);
      setPhase('result');
      setAttemptCount((prev) => prev + 1);
      if (res.passed && onPassed) onPassed();
      if (res.new_certificate && res.certificate_number && onCertificate) {
        onCertificate(res.certificate_number);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  // Таймер обратного отсчёта с автосдачей
  useEffect(() => {
    if (phase !== 'taking' || remaining === null) return;
    if (remaining <= 0) { handleSubmit(true); return; }
    const id = setTimeout(() => setRemaining((r) => (r === null ? r : r - 1)), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, remaining]);

  const buildServed = (): ServedQuestion[] => {
    let qs = cfg.shuffle_questions ? shuffle(cfg.questions) : [...cfg.questions];
    const n = cfg.questions_per_attempt > 0 ? Math.min(cfg.questions_per_attempt, qs.length) : qs.length;
    qs = qs.slice(0, n);
    return qs.map((q) => {
      const t = qTypeOf(q);
      const base = q.options.map((_, i) => i);
      let optionOrder = base;
      if (t === 'ordering') optionOrder = shuffle(base);
      else if (cfg.shuffle_options && (t === 'single' || t === 'multiple')) optionOrder = shuffle(base);
      return { q, type: t, optionOrder };
    });
  };

  const handleStart = () => {
    const sv = buildServed();
    const init: Record<string, QuizAnswer> = {};
    sv.forEach((s) => { if (s.type === 'ordering') init[s.q.id] = [...s.optionOrder]; });
    setServed(sv);
    setAnswers(init);
    setViolations(0);
    setWarned(false);
    setRemaining(cfg.time_limit_min > 0 ? cfg.time_limit_min * 60 : null);
    submittingRef.current = false;
    setPhase('taking');
  };

  const typeLabel = TEST_TYPE_LABELS[test.type] ?? 'Тест';
  const isFinal = test.type === 'final';
  const poolTotal = cfg.questions.length;
  const perAttempt = cfg.questions_per_attempt > 0 ? Math.min(cfg.questions_per_attempt, poolTotal) : poolTotal;

  if (loadingPrev) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  // Чипы с параметрами теста (банк/таймер/перемешивание)
  const metaChips = (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
      {cfg.questions_per_attempt > 0 && poolTotal > perAttempt && (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          <ClipboardList className="w-3 h-3" /> {perAttempt} случайных из {poolTotal}
        </span>
      )}
      {cfg.time_limit_min > 0 && (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
          <Clock className="w-3 h-3" /> {cfg.time_limit_min} мин
        </span>
      )}
      {(cfg.shuffle_questions || cfg.shuffle_options) && (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          случайный порядок
        </span>
      )}
    </div>
  );

  // ── Idle / start screen ──────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-8 text-center"
      >
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl mb-6 ${
          isFinal ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30'
                  : 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30'}`}>
          {isFinal ? <Trophy className="w-10 h-10 text-white" /> : <ClipboardList className="w-10 h-10 text-white" />}
        </div>
        <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 ${
          isFinal ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}`}>
          {typeLabel}
        </span>
        <h2 className="text-3xl font-black text-slate-900 mb-2">{test.title || typeLabel}</h2>
        <p className="text-slate-500 font-medium mb-1">
          {perAttempt} {perAttempt === 1 ? 'вопрос' : perAttempt < 5 ? 'вопроса' : 'вопросов'} · порог прохождения {cfg.pass_threshold}%
        </p>
        {isFinal && <p className="text-amber-600/70 text-sm font-semibold">Подтвердите усвоение всего курса</p>}
        {metaChips}
        {poolTotal === 0 ? (
          <p className="text-slate-400 italic mt-4">Тест ещё не содержит вопросов</p>
        ) : (
          <button
            onClick={handleStart}
            className={`mt-8 px-10 py-4 text-white rounded-2xl font-bold text-lg shadow-xl hover:-translate-y-1 transition-all ${
              isFinal ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'}`}
          >
            {isFinal ? 'Начать итоговый тест →' : 'Начать тест →'}
          </button>
        )}
      </motion.div>
    );
  }

  // ── Taking test ──────────────────────────────────────────────────────────
  if (phase === 'taking') {
    const lowTime = remaining !== null && remaining <= 30;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 px-2">
        {/* Proctoring banner */}
        <div className={`flex items-center gap-3 mb-6 px-4 py-3 rounded-2xl border text-sm font-semibold transition-colors ${
          warned ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          {warned ? <ShieldAlert className="w-5 h-5 shrink-0" /> : <Eye className="w-5 h-5 shrink-0 text-emerald-500" />}
          {warned ? (
            <span>Зафиксирован выход из окна теста: <b>{violations}</b>. Не покидайте страницу до завершения — это видит куратор.</span>
          ) : (
            <span>Тест проходит под наблюдением: не переключайте вкладки и окна до отправки ответов.</span>
          )}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="min-w-0">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">{typeLabel}</span>
            <h2 className="text-2xl font-black text-slate-900 mt-1 truncate">{test.title || typeLabel}</h2>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {remaining !== null && (
              <div className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-black tabular-nums transition-colors ${
                lowTime ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-amber-50 text-amber-600'}`}>
                <Clock className="w-4 h-4" /> {fmtTime(remaining)}
              </div>
            )}
            <div className="text-right">
              <span className="text-3xl font-black text-brand">{answered}</span>
              <span className="text-slate-400 font-bold">/{total}</span>
              <p className="text-xs text-slate-400 font-semibold">ответов</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full mb-10 overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${total > 0 ? (answered / total) * 100 : 0}%` }} />
        </div>

        {/* Questions */}
        <div className="space-y-10">
          {served.map((s, qIdx) => (
            <div key={s.q.id} className="bg-white rounded-3xl border border-slate-100 p-7 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Вопрос {qIdx + 1}</p>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {QUESTION_TYPE_LABEL[s.type]}
                </span>
              </div>
              <p className="text-slate-800 font-bold text-xl leading-snug mb-6">{s.q.question}</p>
              <TakingQuestion s={s} answer={answers[s.q.id]} onAnswer={(val) => setAnswers((p) => ({ ...p, [s.q.id]: val }))} />
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="mt-10 flex items-center justify-between">
          <p className="text-sm text-slate-400 font-semibold">
            {answered < total
              ? `Ответьте ещё на ${total - answered} ${total - answered === 1 ? 'вопрос' : 'вопроса'}`
              : 'Все вопросы отвечены — можно отправить!'}
          </p>
          <button
            onClick={() => handleSubmit(false)}
            disabled={answered < total || loading}
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-xl shadow-emerald-600/25 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:hover:translate-y-0"
          >
            {loading ? 'Проверяем...' : 'Отправить ответы →'}
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Result screen ────────────────────────────────────────────────────────
  const passed = attempt?.passed ?? false;
  const score = attempt?.score ?? 0;
  // Разбор показываем по показанной выборке, если разрешено настройками.
  const reviewSet = served.length > 0 ? served : cfg.questions.map((q) => ({ q, type: qTypeOf(q), optionOrder: q.options.map((_, i) => i) }));

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="py-8 px-2">
      {/* Score card */}
      <div className={`rounded-3xl p-10 text-center mb-8 relative overflow-hidden ${
        passed
          ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-xl shadow-emerald-500/30'
          : 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-xl shadow-red-500/30'
      }`}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 60%)' }} />
        <div className="relative z-10">
          {passed ? <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-90" /> : <XCircle className="w-16 h-16 mx-auto mb-4 opacity-90" />}
          <p className="text-white/50 font-bold uppercase tracking-widest text-xs mb-2">Попытка {attemptCount}</p>
          <p className="text-white/70 font-bold uppercase tracking-widest text-sm mb-2">Результат</p>
          <p className="text-7xl font-black mb-2">{score}%</p>
          <p className="text-white/80 font-semibold text-lg">
            {passed ? '🎉 Тест пройден!' : `❌ Не пройден (порог: ${cfg.pass_threshold}%)`}
          </p>
        </div>
      </div>

      {/* Proctoring violations note */}
      {(attempt?.focus_violations ?? 0) > 0 && (
        <div className="flex items-center gap-3 mb-8 px-5 py-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-700">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span className="font-semibold text-sm">
            Во время теста зафиксирован выход из окна: <b>{attempt!.focus_violations}</b>{' '}
            {attempt!.focus_violations === 1 ? 'раз' : 'раз(а)'}. Информация сохранена для куратора.
          </span>
        </div>
      )}

      {/* Question review */}
      {cfg.show_correct_answers && attempt && reviewSet.length > 0 ? (
        <div className="space-y-4 mb-8">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Разбор ответов</p>
          {reviewSet.map((s, qIdx) => (
            <ReviewQuestion
              key={s.q.id}
              s={s}
              index={qIdx}
              userAnswer={attempt.answers[s.q.id] ?? attempt.answers[String(s.q.id)]}
            />
          ))}
        </div>
      ) : !cfg.show_correct_answers && (
        <p className="text-sm text-slate-400 font-medium mb-8 italic">Разбор ответов скрыт настройками теста.</p>
      )}

      {/* Retry / passed status */}
      {passed ? (
        <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-bold text-sm w-fit">
          <CheckCircle2 className="w-4 h-4" /> Тест пройден
        </div>
      ) : (
        <button
          onClick={handleStart}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold hover:border-brand hover:text-brand transition-all text-sm"
        >
          <RotateCcw className="w-4 h-4" /> Попытка {attemptCount + 1} — Пройти ещё раз
        </button>
      )}
    </motion.div>
  );
}

// ── Один вопрос в режиме прохождения ──────────────────────────────────────────
function TakingQuestion({ s, answer, onAnswer }: {
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

// ── Разбор одного вопроса ─────────────────────────────────────────────────────
function ReviewQuestion({ s, index, userAnswer }: {
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

// ── Main component ────────────────────────────────────────────────────────────
export function StudentCourse() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<CourseRead | null>(null);
  const [progress, setProgress] = useState<CourseProgressRead | null>(null);
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);
  const [completing, setCompleting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [aiChat, setAiChat] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Привет! Я ваш ИИ-наставник. Задайте вопрос по материалу этого урока.' },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [syllabusExpanded, setSyllabusExpanded] = useState(true);
  const [awardedCertNumber, setAwardedCertNumber] = useState<string | null>(null);
  // Причина, по которой урок ещё нельзя завершить (серверный гейт, 409)
  const [completeError, setCompleteError] = useState<string | null>(null);
  // Доля просмотра видео по блокам (для гейта обязательного просмотра)
  const [videoWatched, setVideoWatched] = useState<Record<string, number>>({});
  // Последняя отправленная на сервер доля по блоку — чтобы не спамить запросами
  const sentWatchRef = useRef<Record<string, number>>({});
  const reportWatch = (blockId: string, frac: number) => {
    setVideoWatched((prev) => ({ ...prev, [blockId]: Math.max(prev[blockId] ?? 0, frac) }));
    // Персистим на сервер нарастающим итогом: на каждые +10% и обязательно при ≥90%
    const lastSent = sentWatchRef.current[blockId] ?? -1;
    if (frac - lastSent >= 0.1 || (frac >= 0.9 && lastSent < 0.9)) {
      sentWatchRef.current[blockId] = frac;
      apiPost('/api/progress/video', { block_id: blockId, ratio: frac }).catch(() => {});
    }
  };

  const loadProgress = async () => {
    if (!courseId) return;
    try {
      const p = await apiGet<CourseProgressRead>(`/api/progress/courses/${courseId}`);
      setProgress(p);
    } catch { /* progress refresh is best-effort */ }
  };

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
    setCompleteError(null);
    if (activeItem?.kind !== 'lesson') return;
    setAiChat([{ role: 'ai', text: 'Готов помочь по этому уроку. Задайте вопрос по материалу.' }]);
  }, [activeItem]);

  useEffect(() => {
    if (!courseId) return;
    Promise.all([
      apiGet<CourseRead>(`/api/courses/${courseId}`),
      apiGet<CourseProgressRead>(`/api/progress/courses/${courseId}`),
    ])
      .then(([c, p]) => {
        setCourse(c);
        setProgress(p);
        const firstNormal = c.modules.find((m) => m.title !== '__root__');
        if (firstNormal && firstNormal.lessons.length > 0) {
          setActiveItem({ kind: 'lesson', id: firstNormal.lessons[0].id });
        }
      })
      .catch(console.error);
  }, [courseId]);

  const normalModules = course?.modules.filter((m) => m.title !== '__root__') ?? [];
  const rootModule   = course?.modules.find((m) => m.title === '__root__');

  const allLessons: LessonRead[] = course?.modules.flatMap((m) => m.lessons) ?? [];
  const activeLesson = activeItem?.kind === 'lesson'
    ? allLessons.find((l) => l.id === activeItem.id)
    : undefined;

  const allTests: ModuleTest[] = course?.modules.flatMap((m) => m.tests ?? []) ?? [];
  const activeTest = activeItem?.kind === 'test'
    ? allTests.find((t) => t.id === activeItem.id)
    : undefined;

  // Плоский упорядоченный список всех элементов: уроки→тесты по каждому модулю, затем итоговый раздел
  const allOrderedItems: ActiveItem[] = [
    ...normalModules.flatMap((m) => [
      ...m.lessons.map((l) => ({ kind: 'lesson' as const, id: l.id })),
      ...(m.tests ?? []).map((t) => ({ kind: 'test' as const, id: t.id })),
    ]),
    ...(rootModule ? [
      ...rootModule.lessons.map((l) => ({ kind: 'lesson' as const, id: l.id })),
      ...(rootModule.tests ?? []).map((t) => ({ kind: 'test' as const, id: t.id })),
    ] : []),
  ];

  const activeOrderedIndex = allOrderedItems.findIndex(
    (item) => item.kind === activeItem?.kind && item.id === activeItem?.id,
  );
  const prevOrderedItem = activeOrderedIndex > 0 ? allOrderedItems[activeOrderedIndex - 1] : null;
  const nextOrderedItem = activeOrderedIndex < allOrderedItems.length - 1
    ? allOrderedItems[activeOrderedIndex + 1]
    : null;

  // Лейблы для кнопки «Назад»
  const prevOrderedLabel = prevOrderedItem?.kind === 'lesson'
    ? allLessons.find((l) => l.id === prevOrderedItem.id)?.title
    : prevOrderedItem?.kind === 'test'
      ? (allTests.find((t) => t.id === prevOrderedItem.id)?.title || 'Тест')
      : undefined;

  const completedIds = new Set(
    progress?.lessons.filter((l) => l.is_completed).map((l) => l.lesson_id) ?? []
  );

  // ── Траектория: последовательное прохождение ───────────────────────────────
  const passedTestIds = new Set(
    progress?.tests.filter((t) => t.passed).map((t) => t.test_id) ?? []
  );
  const isItemSatisfied = (item: ActiveItem): boolean =>
    item.kind === 'lesson' ? completedIds.has(item.id) : passedTestIds.has(item.id);

  // Элемент заблокирован, если включён sequential и какой-то предыдущий не пройден.
  const isItemLocked = (item: ActiveItem): boolean => {
    if (!course?.sequential) return false;
    const idx = allOrderedItems.findIndex((i) => i.kind === item.kind && i.id === item.id);
    if (idx <= 0) return false;
    return allOrderedItems.slice(0, idx).some((i) => !isItemSatisfied(i));
  };

  // Навигация с уважением к блокировке (нельзя перескочить вперёд).
  const go = (item: ActiveItem) => { if (!isItemLocked(item)) setActiveItem(item); };

  // ── Гейт обязательного просмотра видео ─────────────────────────────────────
  const activeVideoBlocks = activeLesson?.blocks.filter(
    (b) => b.type === 'video' && isPlayableVideo(b.content)
  ) ?? [];
  const videoGateActive = !!course?.require_video && activeVideoBlocks.length > 0;
  const videoGateOk = !videoGateActive
    || activeVideoBlocks.every((b) => (videoWatched[b.id] ?? 0) >= 0.9);

  const handleComplete = async () => {
    if (!activeItem || activeItem.kind !== 'lesson') return;
    setCompleting(true);
    setCompleteError(null);
    try {
      const res = await apiPut<LessonCompleteResponse>(
        `/api/progress/lessons/${activeItem.id}/complete`,
        {}
      );
      await loadProgress();
      if (res?.new_certificate && res.certificate_number) {
        setAwardedCertNumber(res.certificate_number);
      } else if (nextOrderedItem) {
        setActiveItem(nextOrderedItem);
      }
    } catch (err) {
      // Серверный гейт вернул причину (409) — показываем её студенту
      setCompleteError(err instanceof Error ? err.message : 'Не удалось завершить урок');
    } finally {
      setCompleting(false);
    }
  };

  const sendAi = async () => {
    const text = aiInput.trim();
    if (!text || aiLoading || !activeItem || activeItem.kind !== 'lesson') return;
    const newHistory = [...aiChat, { role: 'user' as const, text }];
    setAiChat(newHistory);
    setAiInput('');
    setAiLoading(true);
    try {
      const history = newHistory.slice(1).slice(-8).map((m) => ({
        role: m.role === 'ai' ? ('assistant' as const) : ('user' as const),
        content: m.text,
      }));
      const res = await apiPost<{ reply: string }>('/api/ai/lesson-assistant', {
        lesson_id: activeItem.id,
        message: text,
        history: history.slice(0, -1),
      });
      setAiChat((prev) => [...prev, { role: 'ai', text: res.reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось получить ответ';
      setAiChat((prev) => [...prev, { role: 'ai', text: `⚠️ ${msg}` }]);
    } finally {
      setAiLoading(false);
    }
  };

  if (!course) return <LoadingSpinner fullPage />;

  return (
    <>
      <CertificateAwardedModal
        open={!!awardedCertNumber}
        certificateNumber={awardedCertNumber}
        onClose={() => setAwardedCertNumber(null)}
      />
      <PageLayout sidebar={showSidebar ? <Sidebar /> : null}>

        {/* Navbar */}
        <nav className="glass-nav rounded-[2rem] px-6 py-3 mx-6 mt-6 mb-4 flex justify-between items-center shadow-[0_4px_30px_rgba(0,0,0,0.05)] shrink-0 z-50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar((v) => !v)}
              className="w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-600 transition-colors shadow-sm"
            >
              {showSidebar ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
            <Link to="/dashboard" className="w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-600 transition-colors shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="hidden sm:block">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{course.title}</div>
              <h1 className="text-sm font-extrabold text-slate-800 truncate max-w-xs md:max-w-sm">
                {activeItem?.kind === 'test'
                  ? (activeTest?.title || TEST_TYPE_LABELS[activeTest?.type ?? ''] || 'Тест')
                  : (activeLesson?.title || 'Выберите урок')}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {progress && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] font-bold text-brand uppercase tracking-widest bg-brand-light px-2 py-0.5 rounded-md mb-1">
                  Прогресс: {progress.progress_percent}%
                </span>
                <div className="w-48 h-2 bg-slate-200/50 rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full transition-all duration-700" style={{ width: `${progress.progress_percent}%` }} />
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-20">

          {/* Certificate gate hint: уроки пройдены, но остались тесты */}
          {progress && progress.tests_total > 0 && progress.progress_percent === 100 && progress.tests_passed < progress.tests_total && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto mb-4 flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-[24px] border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-white shadow-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-slate-800">Все уроки пройдены — остался последний шаг!</h4>
                <p className="text-sm text-slate-500 font-medium">
                  Сдайте {progress.tests_total === 1 ? 'итоговый тест' : 'тесты'}, чтобы получить сертификат.
                  Пройдено: {progress.tests_passed}/{progress.tests_total}.
                </p>
              </div>
              <button
                onClick={() => {
                  const firstTest = allOrderedItems.find((i) => i.kind === 'test');
                  if (firstTest) setActiveItem(firstTest);
                }}
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/25 hover:-translate-y-0.5 transition-all shrink-0 flex items-center gap-2"
              >
                <Trophy className="w-4 h-4" /> Перейти к тесту
              </button>
            </motion.div>
          )}

          <div className="flex gap-6 mt-2 h-full items-start max-w-7xl mx-auto">

            {/* ── Syllabus ── */}
            <div className={`bento-card flex flex-col h-full max-h-[85vh] sticky top-0 overflow-y-auto bg-white/90 backdrop-blur-xl shrink-0 transition-all duration-300 ease-out ${syllabusExpanded ? 'w-[340px] p-8' : 'w-[78px] p-3'}`}>
              <div className={`flex items-center mb-6 ${syllabusExpanded ? 'justify-between' : 'justify-center'}`}>
                {syllabusExpanded && (
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <BookOpen className="text-brand w-5 h-5" /> Программа
                  </h3>
                )}
                <button
                  onClick={() => setSyllabusExpanded(v => !v)}
                  className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-brand flex items-center justify-center transition-colors"
                >
                  {syllabusExpanded ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
                </button>
              </div>

              {/* Collapsed view */}
              {!syllabusExpanded ? (
                <div className="space-y-1.5">
                  {normalModules.flatMap((m) => m.lessons).map((lesson, idx) => {
                    const isActive = activeItem?.kind === 'lesson' && activeItem.id === lesson.id;
                    const isDone = completedIds.has(lesson.id);
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => go({ kind: 'lesson', id: lesson.id })}
                        title={`${idx + 1}. ${lesson.title}`}
                        className={`w-full h-12 rounded-2xl flex items-center justify-center transition-all border-2 ${
                          isActive ? 'bg-brand/10 border-brand/30 text-brand shadow-sm'
                          : isDone ? 'bg-brand/5 border-brand/30 text-brand'
                          : 'bg-white border-slate-200 text-slate-400 hover:border-brand/30 hover:text-brand'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-extrabold">{idx + 1}</span>}
                      </button>
                    );
                  })}
                  {/* Module tests (emerald) */}
                  {normalModules.flatMap((m) => m.tests ?? []).map((test) => {
                    const isActive = activeItem?.kind === 'test' && activeItem.id === test.id;
                    return (
                      <button
                        key={test.id}
                        onClick={() => go({ kind: 'test', id: test.id })}
                        title={test.title || 'Тест'}
                        className={`w-full h-12 rounded-2xl flex items-center justify-center transition-all border-2 ${
                          isActive ? 'bg-emerald-100 border-emerald-400 text-emerald-700 shadow-sm'
                          : 'bg-emerald-50 border-emerald-100 text-emerald-400 hover:border-emerald-300 hover:text-emerald-600'
                        }`}
                      >
                        <ClipboardList className="w-4 h-4" />
                      </button>
                    );
                  })}
                  {/* Root lessons */}
                  {(rootModule?.lessons ?? []).map((lesson) => {
                    const isActive = activeItem?.kind === 'lesson' && activeItem.id === lesson.id;
                    const isDone = completedIds.has(lesson.id);
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => go({ kind: 'lesson', id: lesson.id })}
                        title={lesson.title}
                        className={`w-full h-12 rounded-2xl flex items-center justify-center transition-all border-2 ${
                          isActive ? 'bg-amber-100 border-amber-400 text-amber-700 shadow-sm'
                          : isDone ? 'bg-amber-50 border-amber-200 text-amber-500'
                          : 'bg-white border-amber-200 text-amber-300 hover:border-amber-400 hover:text-amber-500'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-extrabold">★</span>}
                      </button>
                    );
                  })}
                  {/* Root (final) tests — amber */}
                  {(rootModule?.tests ?? []).map((test) => {
                    const isActive = activeItem?.kind === 'test' && activeItem.id === test.id;
                    return (
                      <button
                        key={test.id}
                        onClick={() => go({ kind: 'test', id: test.id })}
                        title={test.title || 'Итоговый тест'}
                        className={`w-full h-12 rounded-2xl flex items-center justify-center transition-all border-2 ${
                          isActive ? 'bg-amber-100 border-amber-400 text-amber-700 shadow-sm'
                          : 'bg-amber-50 border-amber-100 text-amber-400 hover:border-amber-300 hover:text-amber-600'
                        }`}
                      >
                        <Trophy className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Expanded view */
                <div className="space-y-8">
                  {/* Normal modules */}
                  {normalModules.map((module) => (
                    <div key={module.id}>
                      <h4 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-4 pl-2">
                        {module.title}
                      </h4>
                      <div className="space-y-2">
                        {module.lessons.map((lesson) => {
                          const isActive = activeItem?.kind === 'lesson' && activeItem.id === lesson.id;
                          const isDone = completedIds.has(lesson.id);
                          const locked = isItemLocked({ kind: 'lesson', id: lesson.id });
                          return (
                            <div
                              key={lesson.id}
                              onClick={() => go({ kind: 'lesson', id: lesson.id })}
                              title={locked ? 'Сначала пройдите предыдущие шаги' : undefined}
                              className={`flex items-start gap-3 p-3 rounded-2xl transition-all border border-transparent ${
                                locked ? 'opacity-50 cursor-not-allowed'
                                : isActive ? 'bg-brand/10 border-brand/20 shadow-sm cursor-pointer'
                                : 'hover:bg-slate-50 hover:border-slate-200 cursor-pointer'
                              }`}
                            >
                              <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2 bg-white ${
                                isDone ? 'border-brand text-brand bg-brand/5 shadow-sm'
                                : isActive ? 'border-brand/40 text-brand shadow-sm'
                                : 'border-slate-200 text-slate-300'
                              }`}>
                                {locked ? (
                                  <Lock className="w-4 h-4 text-slate-300" />
                                ) : isDone ? (
                                  <CheckCircle2 className="w-4 h-4 fill-brand text-white" />
                                ) : lesson.type === 'video' ? (
                                  <Video className="w-4 h-4" />
                                ) : (
                                  <FileText className="w-4 h-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className={`text-sm leading-snug line-clamp-2 ${isActive ? 'font-bold text-brand' : 'font-semibold text-slate-700'}`}>
                                  {lesson.title}
                                </h5>
                                <span className="text-[10px] font-bold text-slate-400 mt-1 block">{lesson.duration}</span>
                              </div>
                            </div>
                          );
                        })}
                        {(module.tests ?? []).map((test) => {
                          const isActive = activeItem?.kind === 'test' && activeItem.id === test.id;
                          const typeLabel = TEST_TYPE_LABELS[test.type] ?? 'Тест';
                          const locked = isItemLocked({ kind: 'test', id: test.id });
                          const testDone = passedTestIds.has(test.id);
                          return (
                            <div
                              key={test.id}
                              onClick={() => go({ kind: 'test', id: test.id })}
                              title={locked ? 'Сначала пройдите предыдущие шаги' : undefined}
                              className={`flex items-start gap-3 p-3 rounded-2xl transition-all border ${
                                locked ? 'opacity-50 cursor-not-allowed border-transparent'
                                : isActive ? 'bg-emerald-50 border-emerald-200 shadow-sm cursor-pointer'
                                : 'border-transparent hover:bg-emerald-50/50 hover:border-emerald-100 cursor-pointer'
                              }`}
                            >
                              <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2 bg-white ${
                                testDone ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                                : isActive ? 'border-emerald-400 text-emerald-600' : 'border-emerald-200 text-emerald-400'
                              }`}>
                                {locked ? <Lock className="w-4 h-4 text-slate-300" />
                                  : testDone ? <CheckCircle2 className="w-4 h-4" />
                                  : <ClipboardList className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className={`text-sm leading-snug line-clamp-2 ${isActive ? 'font-bold text-emerald-700' : 'font-semibold text-slate-600'}`}>
                                  {test.title || typeLabel}
                                </h5>
                                <span className={`text-[10px] font-bold mt-1 block ${isActive ? 'text-emerald-500' : 'text-emerald-400'}`}>
                                  {typeLabel}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* ── Final section (root module) ── */}
                  {rootModule && (rootModule.lessons.length > 0 || rootModule.tests.length > 0) && (
                    <div>
                      <div className="flex items-center gap-2 mb-4 pl-2">
                        <div className="flex-1 h-px bg-amber-200/70" />
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Итоговый раздел</span>
                        </div>
                        <div className="flex-1 h-px bg-amber-200/70" />
                      </div>
                      <div className="space-y-2">
                        {rootModule.lessons.map((lesson) => {
                          const isActive = activeItem?.kind === 'lesson' && activeItem.id === lesson.id;
                          const isDone = completedIds.has(lesson.id);
                          return (
                            <div
                              key={lesson.id}
                              onClick={() => go({ kind: 'lesson', id: lesson.id })}
                              className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all border border-transparent ${
                                isActive ? 'bg-amber-50 border-amber-200 shadow-sm' : 'hover:bg-amber-50/50 hover:border-amber-100'
                              }`}
                            >
                              <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2 bg-white ${
                                isDone ? 'border-amber-400 text-amber-500 bg-amber-50 shadow-sm'
                                : isActive ? 'border-amber-300 text-amber-500 shadow-sm'
                                : 'border-amber-200 text-amber-300'
                              }`}>
                                {isDone ? <CheckCircle2 className="w-4 h-4" /> : lesson.type === 'video' ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className={`text-sm leading-snug line-clamp-2 ${isActive ? 'font-bold text-amber-700' : 'font-semibold text-slate-700'}`}>
                                  {lesson.title}
                                </h5>
                                <span className="text-[10px] font-bold text-amber-400 mt-1 block">{lesson.duration}</span>
                              </div>
                            </div>
                          );
                        })}
                        {rootModule.tests.map((test) => {
                          const isActive = activeItem?.kind === 'test' && activeItem.id === test.id;
                          return (
                            <div
                              key={test.id}
                              onClick={() => go({ kind: 'test', id: test.id })}
                              className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${
                                isActive ? 'bg-amber-50 border-amber-300 shadow-sm' : 'border-transparent hover:bg-amber-50/60 hover:border-amber-100'
                              }`}
                            >
                              <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2 bg-white ${
                                isActive ? 'border-amber-400 text-amber-600' : 'border-amber-200 text-amber-400'
                              }`}>
                                <Trophy className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className={`text-sm leading-snug line-clamp-2 ${isActive ? 'font-bold text-amber-700' : 'font-semibold text-slate-600'}`}>
                                  {test.title || 'Итоговый тест'}
                                </h5>
                                <span className={`text-[10px] font-bold mt-1 block ${isActive ? 'text-amber-500' : 'text-amber-400'}`}>
                                  Итоговый тест
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Main content panel ── */}
            <div ref={contentRef} className="bento-card flex-1 min-w-0 p-10 bg-white/90 backdrop-blur-xl relative h-full max-h-[85vh] overflow-y-auto transition-all duration-300">
              <AnimatePresence mode="wait">

                {/* Test view */}
                {activeItem?.kind === 'test' && activeTest && (
                  <motion.div
                    key={`test-${activeTest.id}`}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <ModuleTestPlayer
                      key={activeTest.id}
                      test={activeTest}
                      onCertificate={(certNumber) => setAwardedCertNumber(certNumber)}
                      onPassed={loadProgress}
                    />
                  </motion.div>
                )}

                {/* Lesson view */}
                {activeItem?.kind === 'lesson' && activeLesson && (
                  <motion.div
                    key={activeLesson.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mb-10">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-widest mb-6">
                        {activeLesson.type === 'video' ? <PlayCircle className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />} Материал
                      </div>
                      <h2 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight mb-4">
                        {activeLesson.title}
                      </h2>
                    </div>

                    <div className="space-y-6 mb-12">
                      {activeLesson.blocks.map((block) => (
                        <div key={block.id}>
                          {block.type === 'text' && (
                            <div className="prose-editor max-w-none" dangerouslySetInnerHTML={{ __html: block.content }} />
                          )}
                          {block.type === 'video' && (
                            <MediaBlock
                              block={block}
                              onWatch={course.require_video && isPlayableVideo(block.content)
                                ? (frac) => reportWatch(block.id, frac) : undefined}
                            />
                          )}
                          {block.type === 'quiz' && (
                            <InteractiveQuiz block={block} lessonId={activeLesson.id} onComplete={loadProgress} />
                          )}
                          {block.type === 'callout'   && <CalloutView   content={block.content} />}
                          {block.type === 'checklist' && <ChecklistView content={block.content} />}
                          {block.type === 'open_answer' && <OpenAnswerView block={block} lessonId={activeLesson.id} />}
                        </div>
                      ))}
                      {activeLesson.blocks.length === 0 && (
                        <p className="text-slate-400 italic">Урок пуст. Контент ещё не добавлен.</p>
                      )}
                    </div>

                    {/* AI chat */}
                    <div className="mt-12 mb-8 bg-gradient-to-r from-amber-200/50 to-amber-100/10 p-[2px] rounded-[30px]">
                      <div className="bg-white/90 backdrop-blur-md rounded-[28px] p-8 shadow-[0_10px_40px_-10px_rgba(245,158,11,0.15)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />
                        <div className="flex items-center gap-4 mb-8 relative z-10">
                          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-500 text-white rounded-[20px] flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <Bot className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-xl">Умный ассистент</h4>
                            <p className="text-sm text-slate-500 font-medium">Задайте вопрос по материалу</p>
                          </div>
                        </div>
                        <div className="space-y-4 mb-6 max-h-[240px] overflow-y-auto pr-2 relative z-10 flex flex-col">
                          {aiChat.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`max-w-[85%] p-4 rounded-2xl whitespace-pre-wrap ${
                                msg.role === 'ai'
                                  ? 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-sm self-start'
                                  : 'bg-brand text-white rounded-tr-sm self-end shadow-md'
                              }`}
                            >
                              {msg.role === 'ai' && <Sparkles className="w-3 h-3 text-amber-500 mb-1" />}
                              <p className="text-[0.95rem] leading-relaxed m-0 font-medium">{msg.text}</p>
                            </div>
                          ))}
                          {aiLoading && (
                            <div className="max-w-[85%] p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500 rounded-tl-sm self-start">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="relative z-10 flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:border-amber-400 transition-colors">
                          <input
                            type="text"
                            value={aiInput}
                            onChange={(e) => setAiInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendAi()}
                            disabled={aiLoading}
                            placeholder="Спросите по теме урока..."
                            className="flex-1 bg-transparent px-4 py-3 text-slate-700 outline-none font-medium placeholder-slate-400 disabled:opacity-50"
                          />
                          <button
                            onClick={sendAi}
                            disabled={aiLoading || !aiInput.trim()}
                            className="w-12 h-12 bg-slate-900 hover:bg-brand text-white rounded-xl flex items-center justify-center transition-colors shadow-md disabled:opacity-50 disabled:hover:bg-slate-900"
                          >
                            <Send className="w-5 h-5 ml-0.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lesson navigation */}
                    <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => prevOrderedItem && setActiveItem(prevOrderedItem)}
                        disabled={!prevOrderedItem}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-700 font-bold transition-colors disabled:opacity-30"
                      >
                        <ChevronLeft className="w-5 h-5" />
                        {prevOrderedLabel || 'Назад'}
                      </button>

                      {completedIds.has(activeLesson.id) ? (
                        <span className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-2xl">
                          <CheckCircle2 className="w-4 h-4" /> Завершено
                        </span>
                      ) : (
                        <div className="flex flex-col items-end gap-2">
                          {videoGateActive && !videoGateOk && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl">
                              <PlayCircle className="w-3.5 h-3.5" />
                              Досмотрите видео ({Math.round(Math.min(...activeVideoBlocks.map((b) => videoWatched[b.id] ?? 0)) * 100)}%), чтобы завершить
                            </span>
                          )}
                          {completeError && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl max-w-xs text-right">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              {completeError}
                            </span>
                          )}
                          <button
                            id="complete-lesson-btn"
                            onClick={handleComplete}
                            disabled={completing || !videoGateOk}
                            title={!videoGateOk ? 'Сначала досмотрите видео урока' : undefined}
                            className="flex items-center gap-3 bg-brand hover:bg-brand-dark text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-brand/30 hover:-translate-y-1 transition-all disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                          >
                            {completing ? 'Сохраняем...' : !videoGateOk ? 'Видео не досмотрено' : 'Завершить урок'}
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Empty state */}
                {!activeLesson && !activeTest && (
                  <div className="h-full flex items-center justify-center text-slate-400 font-medium">
                    Выберите урок или тест в программе слева
                  </div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </PageLayout>
    </>
  );
}
