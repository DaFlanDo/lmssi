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
  Bot,
  Send,
  Sparkles,
  ClipboardList,
  Trophy,
  Award,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../../lib/api';
import type {
  CourseRead, CourseProgressRead, LessonRead, LessonCompleteResponse, ModuleTest,
} from '../../types';
import { CertificateAwardedModal } from '../../components/certificate/CertificateAwardedModal';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { CalloutView } from '../hr/constructor/blocks/CalloutBlock';
import { ChecklistView } from '../hr/constructor/blocks/ChecklistBlock';
import { OpenAnswerView } from '../hr/constructor/blocks/OpenAnswerBlock';
import type { ActiveItem } from './course/types';
import { TEST_TYPE_LABELS } from './course/types';
import { isPlayableVideo } from './course/video';
import { InteractiveQuiz } from './course/InteractiveQuiz';
import { MediaBlock } from './course/MediaBlock';
import { ModuleTestPlayer } from './course/ModuleTestPlayer';

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
