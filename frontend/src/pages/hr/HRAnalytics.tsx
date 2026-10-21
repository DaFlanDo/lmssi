import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, GraduationCap, ArrowRight, CalendarClock,
} from 'lucide-react';
import { apiGet } from '../../lib/api';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { Navbar } from '../../components/layout/Navbar';
import { BentoCard } from '../../components/ui/BentoCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

interface PerCourse {
  id: string;
  title: string;
  total: number;
  completed: number;
}

interface Deadline {
  user_name: string;
  course_title: string;
  due_date: string;
  days_overdue: number;
}

interface HRAnalyticsData {
  total_enrollments: number;
  completed: number;
  completion_rate: number;
  overdue: number;
  in_progress: number;
  per_course: PerCourse[];
  deadlines: Deadline[];
}

export function HRAnalytics() {
  const navigate = useNavigate();
  const [data, setData] = useState<HRAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<HRAnalyticsData>('/api/users/hr-analytics')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner fullPage />;
  if (!data) return null;

  const bigStats = [
    { icon: BookOpen, value: data.total_enrollments, label: 'Назначений', accent: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
    { icon: CheckCircle2, value: data.completed, label: 'Завершено', accent: '#059669', bg: 'rgba(16,185,129,0.08)' },
    { icon: Clock, value: data.in_progress, label: 'В процессе', accent: '#0891b2', bg: 'rgba(8,145,178,0.08)' },
    { icon: AlertTriangle, value: data.overdue, label: 'Просрочено', accent: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  ];

  return (
    <PageLayout sidebar={<Sidebar />}>
      <Navbar title="Аналитика обучения" subtitle="LMSSI" />

      <div className="flex-1 overflow-y-auto px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-2">

            {/* Hero — завершаемость */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-8"
            >
              <BentoCard noHover className="relative overflow-hidden min-h-[220px] flex flex-col justify-between border-none" style={{ padding: 0, background: 'none' }}>
                <div className="absolute inset-0 rounded-[28px] overflow-hidden">
                  <div style={{
                    background: 'linear-gradient(145deg, #064e3b 0%, #047857 40%, #059669 70%, #10b981 100%)',
                    position: 'absolute', inset: 0,
                  }} />
                  <div style={{
                    position: 'absolute', top: '-60px', right: '-40px',
                    width: '380px', height: '380px',
                    background: 'radial-gradient(circle, rgba(167,243,208,0.35) 0%, transparent 70%)',
                  }} />
                </div>
                <div className="relative z-10 p-8 flex flex-col h-full justify-between">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                      <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white/80 text-sm font-bold tracking-widest uppercase">Прогресс обучения</span>
                  </div>
                  <div>
                    <div className="flex items-end gap-3 mb-3">
                      <h2 style={{ fontSize: '3.4rem', fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-0.03em' }}>
                        {data.completion_rate}%
                      </h2>
                      <span className="text-white/70 text-sm font-semibold mb-2">курсов завершено</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: data.completed, label: 'завершили' },
                        { value: data.in_progress, label: 'в процессе' },
                        { value: data.overdue, label: 'просрочили' },
                      ].map(s => (
                        <div
                          key={s.label}
                          className="flex items-baseline gap-1.5 px-4 py-2 rounded-2xl"
                          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)' }}
                        >
                          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>{s.value}</span>
                          <span style={{ color: 'rgba(209,250,229,1)', fontSize: '0.68rem', fontWeight: 600 }}>{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </BentoCard>
            </motion.div>

            {/* Кольцо завершаемости */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="md:col-span-4"
            >
              <BentoCard noHover className="p-7 flex flex-col items-center justify-center h-full gap-4">
                <h3 className="font-extrabold text-slate-700 text-sm uppercase tracking-widest self-start">Завершаемость</h3>
                <div className="relative w-36 h-36">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                    <motion.circle
                      cx="50" cy="50" r="42" fill="none" stroke="#059669" strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 42}
                      initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - data.completion_rate / 100) }}
                      transition={{ delay: 0.3, duration: 1, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-800">{data.completion_rate}%</span>
                    <span className="text-[11px] font-semibold text-slate-400">{data.completed}/{data.total_enrollments}</span>
                  </div>
                </div>
              </BentoCard>
            </motion.div>

            {/* Big stats row */}
            {bigStats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="md:col-span-3"
              >
                <BentoCard className="p-6">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: s.bg }}>
                    <s.icon className="w-5 h-5" style={{ color: s.accent }} />
                  </div>
                  <div className="text-3xl font-black text-slate-800 mb-1">{s.value}</div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.label}</div>
                </BentoCard>
              </motion.div>
            ))}

            {/* По курсам — завершаемость */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-7"
            >
              <BentoCard noHover className="p-7 h-full">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-brand" />
                  <h3 className="font-extrabold text-slate-800 text-base">Завершаемость по курсам</h3>
                </div>
                {data.per_course.length === 0 ? (
                  <div className="text-sm text-slate-400 font-medium text-center py-8">Назначений ещё нет</div>
                ) : (
                  <div className="space-y-4">
                    {data.per_course.map((c, i) => {
                      const pct = c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0;
                      return (
                        <div key={c.id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-bold text-slate-700 truncate min-w-0">{c.title}</span>
                            <span className="text-xs font-black text-slate-500 ml-3 shrink-0">{c.completed}/{c.total}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: 0.4 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ background: 'linear-gradient(90deg, #34d399, #059669)' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </BentoCard>
            </motion.div>

            {/* Просроченные дедлайны */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="md:col-span-5"
            >
              <BentoCard noHover className="p-7 h-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-5 h-5 text-rose-500" />
                    <h3 className="font-extrabold text-slate-800 text-base">Просроченные дедлайны</h3>
                  </div>
                  <button
                    onClick={() => navigate('/hr/users')}
                    className="flex items-center gap-1.5 text-xs font-bold text-brand hover:underline transition-colors"
                  >
                    Сотрудники <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {data.deadlines.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    <div className="text-sm text-slate-400 font-medium">Просрочек нет — все в графике</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {data.deadlines.map((d, i) => (
                      <motion.div
                        key={`${d.user_name}-${d.course_title}-${i}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 + i * 0.04 }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all hover:bg-slate-50"
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                          style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.07))', color: '#dc2626' }}
                        >
                          {d.user_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-800 text-sm truncate">{d.user_name}</div>
                          <div className="text-xs text-slate-400 truncate">{d.course_title}</div>
                        </div>
                        <span
                          className="inline-flex items-center px-2 py-1 rounded-xl text-[10px] font-bold shrink-0"
                          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}
                        >
                          −{d.days_overdue} дн.
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </BentoCard>
            </motion.div>

          </div>
        </div>
      </div>
    </PageLayout>
  );
}
