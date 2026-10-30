import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, GraduationCap, Award, AlertTriangle, Clock, Briefcase, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../lib/api';
import type { EnrollmentRead, CourseListItem, CourseProgressRead, CertificateRead } from '../../types';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { Navbar } from '../../components/layout/Navbar';
import { BentoCard } from '../../components/ui/BentoCard';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { CourseCard } from '../../components/ui/CourseCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { HeroAura } from '../../components/ui/HeroAura';
import { CountUp } from '../../components/ui/CountUp';
import { Confetti } from '../../components/ui/Confetti';
import { DashboardSkeleton } from '../../components/ui/Skeleton';

interface EnrolledCourse {
  enrollment: EnrollmentRead;
  course: CourseListItem;
  progress: CourseProgressRead;
}

interface ProgramCourse {
  id: string;
  title: string;
  description: string;
  cover_image: string | null;
  total_lessons: number;
  completed_lessons: number;
  progress_percent: number;
}

interface PositionProgram {
  group: { id: number; name: string } | null;
  courses: ProgramCourse[];
}

export function StudentDashboard() {
  const navigate = useNavigate();
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [certificates, setCertificates] = useState<CertificateRead[]>([]);
  const [program, setProgram] = useState<PositionProgram>({ group: null, courses: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const enrollments = await apiGet<EnrollmentRead[]>('/api/enrollments/my');
        const items = await Promise.all(
          enrollments.map(async (e) => {
            const [course, progress] = await Promise.all([
              apiGet<CourseListItem>(`/api/courses/${e.course_id}`),
              apiGet<CourseProgressRead>(`/api/progress/courses/${e.course_id}`),
            ]);
            return { enrollment: e, course, progress };
          })
        );
        setEnrolled(items);
        try {
          const certs = await apiGet<CertificateRead[]>('/api/certificates/me');
          setCertificates(certs);
        } catch { /* optional data — ignore failures */ }
        try {
          const prog = await apiGet<PositionProgram>('/api/groups/my');
          setProgram(prog);
        } catch { /* optional data — ignore failures */ }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const avgProgress =
    enrolled.length > 0
      ? Math.round(enrolled.reduce((s, e) => s + e.progress.progress_percent, 0) / enrolled.length)
      : 0;

  // Курсы программы должности показываем отдельным блоком — в «Мои курсы»
  // оставляем только индивидуально назначенные (вне программы), чтобы не дублировать.
  const programIds = new Set(program.courses.map((c) => c.id));
  const hasProgram = !!program.group && program.courses.length > 0;
  const programOrder = program.courses.map((c) => c.id);
  const extraEnrolled = hasProgram
    ? enrolled.filter((ec) => !programIds.has(ec.course.id))
    : enrolled;

  // Для hero выбираем НЕзавершённый курс: следующий по цепочке программы,
  // иначе самый продвинутый из начатых. Завершённые курсы в hero не показываем.
  const incompleteEnrolled = enrolled.filter((ec) => ec.progress.progress_percent < 100);
  const activeCourse: EnrolledCourse | null = (() => {
    if (incompleteEnrolled.length === 0) return null;
    const sorted = [...incompleteEnrolled];
    if (hasProgram) {
      sorted.sort((a, b) => {
        const ia = programOrder.indexOf(a.course.id);
        const ib = programOrder.indexOf(b.course.id);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
      return sorted[0];
    }
    return sorted.reduce((best, ec) => (ec.progress.progress_percent > best.progress.progress_percent ? ec : best), sorted[0]);
  })();
  const allComplete = enrolled.length > 0 && incompleteEnrolled.length === 0;

  return (
    <PageLayout sidebar={<Sidebar />}>
      <Navbar title="Мой дашборд" subtitle="LMSSI" />

      <div className="flex-1 overflow-y-auto px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {loading ? <DashboardSkeleton /> : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-2">

            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-8"
            >
              {activeCourse ? (
                <BentoCard noHover className="p-10 relative overflow-hidden min-h-[280px] flex flex-col justify-between bg-slate-900 border-none group">
                  <HeroAura />
                  <div className="relative z-10 flex flex-col h-full justify-between items-start">
                    <div>
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold tracking-wider text-blue-100 uppercase mb-4 border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        {activeCourse.progress.progress_percent > 0 ? 'Активный трек' : 'Следующий курс'}
                      </div>
                      <h2 className="text-4xl font-extrabold leading-tight mb-3 text-white">
                        {activeCourse.course.title}
                      </h2>
                      <p className="text-blue-100/80 text-base font-medium max-w-md">
                        Прогресс: {activeCourse.progress.progress_percent}% • {activeCourse.progress.completed_lessons} из {activeCourse.progress.total_lessons} уроков
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/courses/${activeCourse.course.id}`)}
                      className="mt-8 px-8 py-4 bg-white text-slate-900 hover:text-brand font-bold rounded-2xl shadow-xl hover:shadow-brand/30 hover:-translate-y-1 transition-all flex items-center gap-3"
                    >
                      {activeCourse.progress.progress_percent > 0 ? 'Продолжить обучение' : 'Начать курс'} <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </BentoCard>
              ) : allComplete ? (
                <BentoCard noHover className="p-10 relative overflow-hidden min-h-[280px] flex flex-col justify-between bg-slate-900 border-none group">
                  <HeroAura tone="emerald" />
                  <Confetti />
                  <div className="relative z-10 flex flex-col h-full justify-between items-start">
                    <div>
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wider text-emerald-50 uppercase mb-4 border border-white/10">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Всё пройдено
                      </div>
                      <h2 className="text-4xl font-extrabold leading-tight mb-3 text-white">
                        Все курсы завершены 🎉
                      </h2>
                      <p className="text-emerald-50/90 text-base font-medium max-w-md">
                        Отличная работа! Вы прошли все назначенные курсы.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/certificates')}
                      className="mt-8 px-8 py-4 bg-white text-emerald-700 font-bold rounded-2xl shadow-xl hover:-translate-y-1 transition-all flex items-center gap-3"
                    >
                      Мои сертификаты <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </BentoCard>
              ) : (
                <BentoCard noHover className="p-10 flex items-center justify-center min-h-[280px]">
                  <EmptyState
                    icon={GraduationCap}
                    title="Нет активных курсов"
                    description="Обратитесь к HR-менеджеру для назначения курса"
                  />
                </BentoCard>
              )}
            </motion.div>

            {/* Progress ring */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="md:col-span-4"
            >
              <BentoCard noHover className="p-8 flex flex-col justify-center items-center text-center h-full min-h-[280px]">
                <div className="font-bold text-slate-800 text-lg mb-6 self-start">Средний прогресс</div>
                <div className="relative">
                  <ProgressRing percent={avgProgress} size={160} strokeWidth={14} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold text-slate-800">
                      <CountUp value={avgProgress} duration={1100} /><span className="text-2xl text-slate-400">%</span>
                    </span>
                    <span className="text-[10px] font-bold text-brand uppercase tracking-widest mt-1 bg-brand-light px-2 py-0.5 rounded-md">
                      {enrolled.length} курс{enrolled.length !== 1 ? 'а' : ''}
                    </span>
                  </div>
                </div>
                <p className="mt-6 text-sm text-slate-500 font-medium">
                  {avgProgress >= 80
                    ? 'Отличный темп! Продолжайте в том же духе.'
                    : 'Продолжайте изучать материалы.'}
                </p>
              </BentoCard>
            </motion.div>

            {/* Certificates teaser */}
            {certificates.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="md:col-span-12"
              >
                <Link to="/certificates" className="block group">
                  <div
                    className="relative rounded-[28px] p-5 overflow-hidden flex items-center gap-5 transition-all hover:-translate-y-1"
                    style={{
                      background:
                        '#ffffff',
                      border: '1px solid #c7d2fe',
                      boxShadow: '0 10px 30px -12px rgba(30,58,138,0.18)',
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 relative z-10"
                      style={{
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b5bdb 100%)',
                        boxShadow: '0 8px 20px rgba(30,58,138,0.18)',
                      }}
                    >
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 relative z-10">
                      <div className="text-[10px] tracking-[0.25em] uppercase text-blue-800 font-bold mb-0.5">
                        Ваши достижения
                      </div>
                      <div className="cert-serif text-lg font-black text-slate-900">
                        Получено сертификатов: {certificates.length}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-brand-dark font-bold text-sm relative z-10 group-hover:gap-3 transition-all">
                      Открыть
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Position learning program */}
            {program.group && program.courses.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="md:col-span-12"
              >
                <BentoCard noHover className="p-7">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-2xl bg-brand-light flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5 text-brand" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-lg leading-tight">Программа по должности</h3>
                      <p className="text-sm text-slate-400 font-medium">{program.group.name}</p>
                    </div>
                    <div className="ml-auto text-xs font-bold text-brand bg-brand-light px-3 py-1.5 rounded-xl">
                      {program.courses.filter(c => c.progress_percent === 100).length} / {program.courses.length} пройдено
                    </div>
                  </div>

                  <div className="mt-5 space-y-2.5">
                    {program.courses.map((c, idx) => {
                      const done = c.progress_percent === 100;
                      return (
                        <button
                          key={c.id}
                          onClick={() => navigate(`/courses/${c.id}`)}
                          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50/70 hover:bg-brand-light/60 border border-transparent hover:border-brand/20 transition-all text-left group"
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${
                              done ? 'bg-emerald-500 text-white' : 'bg-white text-brand border border-brand/20'
                            }`}
                          >
                            {done ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">{c.title}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 max-w-[200px] h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-emerald-500' : 'bg-gradient-to-r from-brand to-blue-400'}`}
                                  style={{ width: `${c.progress_percent}%` }}
                                />
                              </div>
                              <span className={`text-[11px] font-bold tabular-nums ${done ? 'text-emerald-600' : 'text-brand'}`}>
                                {c.progress_percent}%
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand group-hover:translate-x-1 transition-all shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </BentoCard>
              </motion.div>
            )}

            {/* Enrolled courses outside the position program */}
            {extraEnrolled.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="md:col-span-12"
              >
                <h3 className="font-extrabold text-slate-700 text-lg mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brand" /> {hasProgram ? 'Другие курсы' : 'Мои курсы'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {extraEnrolled.map((ec) => {
                    const due = ec.enrollment.due_date ? new Date(ec.enrollment.due_date) : null;
                    const done = ec.progress.progress_percent === 100;
                    const now = new Date();
                    const isOverdue = due && !done && due < now;
                    const isDueSoon = due && !done && !isOverdue && due < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    return (
                      <div key={ec.enrollment.id} className="relative">
                        {isOverdue && (
                          <div className="absolute -top-2.5 left-4 z-10 flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
                            <AlertTriangle className="w-3 h-3" />
                            Просрочен
                          </div>
                        )}
                        {isDueSoon && (
                          <div className="absolute -top-2.5 left-4 z-10 flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
                            <Clock className="w-3 h-3" />
                            до {due!.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                        <CourseCard
                          course={ec.course}
                          progress={ec.progress.progress_percent}
                          onClick={() => navigate(`/courses/${ec.course.id}`)}
                        />
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

          </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
