import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, BookOpen, CheckCircle2, Circle, Clock, Award, Calendar,
  ClipboardCheck, Sparkles, Video, Eye, ChevronDown, AlertTriangle,
  PlayCircle, FileText, GraduationCap, ShieldAlert, Activity,
} from 'lucide-react';
import { apiGet } from '../lib/api';
import { PageLayout } from '../components/layout/PageLayout';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/layout/Navbar';
import { BentoCard } from '../components/ui/BentoCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ProgressRing } from '../components/ui/ProgressRing';

interface QuizStat {
  block_id: string;
  attempts_count: number;
  passed: boolean;
  best_score: number;
  last_attempt_at: string | null;
}
interface OpenStat {
  block_id: string;
  attempts_count: number;
  passed: boolean;
  best_score: number;
  last_answer: string | null;
  last_feedback: string | null;
  last_attempt_at: string | null;
}
interface VideoStat {
  block_id: string;
  watched_ratio: number;
}
interface LessonItem {
  kind: 'lesson';
  id: string;
  title: string;
  type: string;
  duration: string;
  is_completed: boolean;
  completed_at: string | null;
  quizzes: QuizStat[];
  open_answers: OpenStat[];
  videos: VideoStat[];
}
interface TestAttempt {
  score: number;
  passed: boolean;
  focus_violations: number;
  attempted_at: string | null;
}
interface TestItem {
  kind: 'test';
  id: string;
  title: string;
  pass_threshold: number;
  passed: boolean;
  best_score: number;
  attempts_count: number;
  max_focus_violations: number;
  attempts: TestAttempt[];
}
type Item = LessonItem | TestItem;
interface ModuleOut {
  id: string;
  title: string;
  is_final: boolean;
  items: Item[];
}
interface Detail {
  user: { id: number; full_name: string; email: string; group_name: string | null };
  course: { id: string; title: string; sequential: boolean; require_video: boolean };
  summary: {
    total_lessons: number;
    completed_lessons: number;
    progress_percent: number;
    tests_total: number;
    tests_passed: number;
    certificate_eligible: boolean;
    is_enrolled: boolean;
    assigned_at: string | null;
    due_date: string | null;
    completed_at: string | null;
    started_at: string | null;
    last_activity_at: string | null;
    certificate: { certificate_number: string; issued_at: string | null; score: number | null } | null;
  };
  modules: ModuleOut[];
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function ScoreChip({ score, passed }: { score: number; passed: boolean }) {
  return (
    <span
      className="text-[11px] font-black px-2 py-0.5 rounded-lg tabular-nums"
      style={passed
        ? { background: 'rgba(16,185,129,0.1)', color: '#059669' }
        : { background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}
    >
      {score}%
    </span>
  );
}

function TestCard({ test }: { test: TestItem }) {
  const [open, setOpen] = useState(false);
  const hasAttempts = test.attempts_count > 0;
  return (
    <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white">
      <button
        onClick={() => hasAttempts && setOpen((o) => !o)}
        className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${hasAttempts ? 'hover:bg-slate-50/60' : ''}`}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: test.passed ? 'rgba(16,185,129,0.1)' : hasAttempts ? 'rgba(239,68,68,0.08)' : 'rgba(100,116,139,0.08)' }}
        >
          <ClipboardCheck className="w-4 h-4" style={{ color: test.passed ? '#059669' : hasAttempts ? '#dc2626' : '#94a3b8' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-800 truncate">{test.title}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 shrink-0">Тест</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
            Порог {test.pass_threshold}% · попыток: {test.attempts_count}
          </div>
        </div>
        {test.max_focus_violations > 0 && (
          <span
            className="hidden sm:flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg shrink-0"
            style={{ background: 'rgba(217,119,6,0.08)', color: '#d97706' }}
            title="Зафиксированные уходы из окна теста (прокторинг)"
          >
            <ShieldAlert className="w-3 h-3" /> {test.max_focus_violations}
          </span>
        )}
        {hasAttempts ? (
          <>
            <ScoreChip score={test.best_score} passed={test.passed} />
            <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
          </>
        ) : (
          <span className="text-[11px] font-bold text-slate-400 px-2 py-1 rounded-lg bg-slate-50 shrink-0">Не проходил</span>
        )}
      </button>

      <AnimatePresence>
        {open && hasAttempts && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-100 bg-slate-50/40"
          >
            <div className="p-4 space-y-2">
              {test.attempts.map((a, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[11px] font-black text-slate-500 shrink-0">
                    {test.attempts.length - i}
                  </span>
                  <ScoreChip score={a.score} passed={a.passed} />
                  <span className={`text-[11px] font-bold ${a.passed ? 'text-emerald-600' : 'text-red-500'}`}>
                    {a.passed ? 'Сдан' : 'Не сдан'}
                  </span>
                  {a.focus_violations > 0 && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600" title="Уходы из окна">
                      <ShieldAlert className="w-3 h-3" /> {a.focus_violations}
                    </span>
                  )}
                  <span className="ml-auto text-[11px] font-medium text-slate-400">{fmtDateTime(a.attempted_at)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LessonCard({ lesson }: { lesson: LessonItem }) {
  const TypeIcon = lesson.type === 'video' ? PlayCircle : FileText;
  const subItems = lesson.quizzes.length + lesson.open_answers.length + lesson.videos.length;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: lesson.is_completed ? 'rgba(16,185,129,0.1)' : 'rgba(37,99,235,0.07)' }}
        >
          {lesson.is_completed
            ? <CheckCircle2 className="w-4 h-4" style={{ color: '#059669' }} />
            : <Circle className="w-4 h-4 text-slate-300" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-800 truncate">{lesson.title}</span>
            <TypeIcon className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          </div>
          <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
            {lesson.is_completed
              ? <span className="text-emerald-600">Пройден · {fmtDateTime(lesson.completed_at)}</span>
              : <span>Не пройден</span>}
          </div>
        </div>
      </div>

      {subItems > 0 && (
        <div className="mt-3 ml-12 space-y-1.5">
          {lesson.quizzes.map((q) => (
            <div key={q.block_id} className="flex items-center gap-2 text-[12px]">
              <ClipboardCheck className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="text-slate-500 font-medium">Встроенный тест</span>
              {q.attempts_count > 0 ? (
                <>
                  <ScoreChip score={q.best_score} passed={q.passed} />
                  <span className="text-[11px] text-slate-400">· попыток: {q.attempts_count}</span>
                </>
              ) : (
                <span className="text-[11px] font-bold text-slate-400">не решён</span>
              )}
            </div>
          ))}
          {lesson.open_answers.map((o) => (
            <div key={o.block_id} className="flex items-start gap-2 text-[12px]">
              <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#d97706' }} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-500 font-medium">Открытый ответ (ИИ)</span>
                  {o.attempts_count > 0 ? (
                    <>
                      <ScoreChip score={o.best_score} passed={o.passed} />
                      <span className="text-[11px] text-slate-400">· попыток: {o.attempts_count}</span>
                    </>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400">нет ответа</span>
                  )}
                </div>
                {o.last_feedback && (
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 italic">«{o.last_feedback}»</p>
                )}
              </div>
            </div>
          ))}
          {lesson.videos.map((v) => (
            <div key={v.block_id} className="flex items-center gap-2 text-[12px]">
              <Video className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="text-slate-500 font-medium">Видео</span>
              <div className="flex items-center gap-1.5">
                <Eye className="w-3 h-3 text-slate-300" />
                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color: v.watched_ratio >= 90 ? '#059669' : v.watched_ratio > 0 ? '#2563eb' : '#94a3b8' }}
                >
                  {v.watched_ratio}% просмотрено
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StudentCourseProgress() {
  const { userId, courseId } = useParams<{ userId: string; courseId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!userId || !courseId) return;
    apiGet<Detail>(`/api/progress/users/${userId}/courses/${courseId}/detail`)
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [userId, courseId]);

  if (loading) return <LoadingSpinner fullPage />;

  if (notFound || !data) {
    return (
      <PageLayout sidebar={<Sidebar />}>
        <Navbar title="Прохождение курса" subtitle="LMSSI" />
        <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center px-6">
          <GraduationCap className="w-14 h-14 text-slate-200" />
          <p className="text-xl font-black text-slate-600">Данные не найдены</p>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
          >
            <ArrowLeft className="w-4 h-4" /> Назад
          </button>
        </div>
      </PageLayout>
    );
  }

  const s = data.summary;
  const overdue = s.due_date && !s.completed_at && new Date(s.due_date) < new Date();

  return (
    <PageLayout sidebar={<Sidebar />}>
      <Navbar title="Прохождение курса" subtitle="LMSSI" />

      <div className="flex-1 overflow-y-auto px-6 pb-20">
        <div className="max-w-5xl mx-auto">

          {/* Back */}
          <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="mt-2 mb-5">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-brand transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Назад
            </button>
          </motion.div>

          {/* Hero summary */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <BentoCard noHover className="p-7">
              <div className="flex flex-col md:flex-row gap-7 items-center md:items-start">
                {/* Ring */}
                <div className="relative shrink-0">
                  <ProgressRing percent={s.progress_percent} size={130} strokeWidth={11} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-800 tabular-nums">{s.progress_percent}%</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">пройдено</span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-bold text-brand mb-1">
                        <GraduationCap className="w-4 h-4" />
                        <span className="truncate">{data.user.full_name}</span>
                        {data.user.group_name && (
                          <span className="text-slate-300 font-medium">· {data.user.group_name}</span>
                        )}
                      </div>
                      <h1 className="text-2xl font-black text-slate-800 leading-tight">{data.course.title}</h1>
                    </div>
                    {s.certificate && (
                      <span
                        className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shrink-0"
                        style={{ background: 'rgba(217,119,6,0.1)', color: '#d97706' }}
                      >
                        <Award className="w-3.5 h-3.5" /> Сертификат выдан
                      </span>
                    )}
                  </div>

                  {/* Stat pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                    {[
                      { icon: BookOpen, label: 'Уроки', value: `${s.completed_lessons}/${s.total_lessons}`, color: '#2563eb' },
                      { icon: ClipboardCheck, label: 'Тесты', value: `${s.tests_passed}/${s.tests_total}`, color: '#7c3aed' },
                      { icon: Activity, label: 'Активность', value: s.last_activity_at ? fmtDate(s.last_activity_at) : '—', color: '#0891b2', small: true },
                      {
                        icon: s.certificate_eligible ? CheckCircle2 : Clock,
                        label: 'Статус',
                        value: s.progress_percent === 100 ? 'Завершён' : s.started_at ? 'В процессе' : 'Не начат',
                        color: s.progress_percent === 100 ? '#059669' : '#64748b',
                        small: true,
                      },
                    ].map((p) => (
                      <div key={p.label} className="rounded-2xl border border-slate-100 p-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          <p.icon className="w-3 h-3" style={{ color: p.color }} /> {p.label}
                        </div>
                        <div className={`font-black text-slate-800 tabular-nums ${p.small ? 'text-sm' : 'text-lg'}`}>{p.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Dates row */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-[12px] font-semibold text-slate-400">
                    {s.assigned_at && (
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Назначен: {fmtDate(s.assigned_at)}</span>
                    )}
                    {s.started_at && (
                      <span className="flex items-center gap-1.5"><PlayCircle className="w-3.5 h-3.5" /> Начат: {fmtDate(s.started_at)}</span>
                    )}
                    {s.due_date && (
                      <span className={`flex items-center gap-1.5 ${overdue ? 'text-red-500' : ''}`}>
                        {overdue ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        Срок: {fmtDate(s.due_date)}{overdue ? ' · просрочен' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </BentoCard>
          </motion.div>

          {/* Modules */}
          <div className="mt-6 space-y-5">
            {data.modules.map((m, mi) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + mi * 0.05 }}
              >
                <BentoCard noHover className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                      style={m.is_final
                        ? { background: 'rgba(217,119,6,0.1)', color: '#d97706' }
                        : { background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}
                    >
                      {m.is_final ? <Award className="w-4 h-4" /> : mi + 1}
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-base">{m.title}</h3>
                    <span className="text-[11px] font-bold text-slate-300 ml-auto">{m.items.length} эл.</span>
                  </div>

                  {m.items.length === 0 ? (
                    <p className="text-sm text-slate-400 font-medium py-3 text-center">В разделе нет элементов</p>
                  ) : (
                    <div className="space-y-2.5">
                      {m.items.map((item) =>
                        item.kind === 'lesson'
                          ? <LessonCard key={item.id} lesson={item} />
                          : <TestCard key={item.id} test={item} />
                      )}
                    </div>
                  )}
                </BentoCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
