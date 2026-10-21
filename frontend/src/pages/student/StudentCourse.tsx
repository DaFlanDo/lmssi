import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../../lib/api';
import type {
  CourseRead, CourseProgressRead, LessonRead, LessonCompleteResponse, ModuleTest,
} from '../../types';
import { CertificateAwardedModal } from '../../components/certificate/CertificateAwardedModal';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { ActiveItem } from './course/types';
import { TEST_TYPE_LABELS } from './course/types';
import { isPlayableVideo } from './course/video';
import { ModuleTestPlayer } from './course/ModuleTestPlayer';
import { Syllabus } from './course/Syllabus';
import { LessonContent } from './course/LessonContent';
import { LessonAssistant } from './course/LessonAssistant';
import { LessonNav } from './course/LessonNav';
import { TestsRemainingBanner } from './course/TestsRemainingBanner';

// ── Main component ────────────────────────────────────────────────────────────
export function StudentCourse() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<CourseRead | null>(null);
  const [progress, setProgress] = useState<CourseProgressRead | null>(null);
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);
  const [completing, setCompleting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
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
            <TestsRemainingBanner
              testsPassed={progress.tests_passed}
              testsTotal={progress.tests_total}
              onGoToTest={() => {
                const firstTest = allOrderedItems.find((i) => i.kind === 'test');
                if (firstTest) setActiveItem(firstTest);
              }}
            />
          )}

          <div className="flex gap-6 mt-2 h-full items-start max-w-7xl mx-auto">

            <Syllabus
              expanded={syllabusExpanded}
              onToggleExpanded={() => setSyllabusExpanded((v) => !v)}
              normalModules={normalModules}
              rootModule={rootModule}
              activeItem={activeItem}
              completedIds={completedIds}
              passedTestIds={passedTestIds}
              isItemLocked={isItemLocked}
              onSelect={go}
            />

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
                    <LessonContent
                      lesson={activeLesson}
                      requireVideo={course.require_video}
                      onVideoWatch={reportWatch}
                      onQuizComplete={loadProgress}
                    />

                    <LessonAssistant key={activeLesson.id} lessonId={activeLesson.id} />

                    <LessonNav
                      prevLabel={prevOrderedLabel}
                      onPrev={prevOrderedItem ? () => setActiveItem(prevOrderedItem) : null}
                      isCompleted={completedIds.has(activeLesson.id)}
                      completing={completing}
                      completeError={completeError}
                      videoBlocked={!videoGateOk}
                      videoPercent={videoGateOk ? 100 : Math.round(Math.min(...activeVideoBlocks.map((b) => videoWatched[b.id] ?? 0)) * 100)}
                      onComplete={handleComplete}
                    />
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
