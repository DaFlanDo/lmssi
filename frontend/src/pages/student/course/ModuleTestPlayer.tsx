import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ClipboardList, Trophy, XCircle, RotateCcw, Eye, ShieldAlert, Clock } from 'lucide-react';
import { apiGet, apiPost } from '../../../lib/api';
import type { ModuleTest, ModuleTestAttemptRead, QuizAnswer } from '../../../types';
import { shuffle, qTypeOf, parseTestContent, QUESTION_TYPE_LABEL, fmtTime } from './testUtils';
import type { ServedQuestion } from './testUtils';
import { TEST_TYPE_LABELS } from './types';
import { TakingQuestion } from './TakingQuestion';
import { ReviewQuestion } from './ReviewQuestion';

// ── Module test player ────────────────────────────────────────────────────────
export function ModuleTestPlayer({ test, onCertificate, onPassed }: {
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
