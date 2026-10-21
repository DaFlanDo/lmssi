import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Users, TrendingUp, ArrowRight, Clock } from 'lucide-react';
import { apiGet } from '../../lib/api';
import type { CourseListItem, User } from '../../types';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { Navbar } from '../../components/layout/Navbar';
import { BentoCard } from '../../components/ui/BentoCard';
import { HeroAura } from '../../components/ui/HeroAura';
import { CountUp } from '../../components/ui/CountUp';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../contexts/AuthContext';

export function HRDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet<CourseListItem[]>('/api/courses/'),
      apiGet<User[]>('/api/users/'),
    ])
      .then(([c, u]) => { setCourses(c); setUsers(u); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const published = courses.filter((c) => c.is_published).length;
  const students = users.filter((u) => u.role === 'student').length;
  const recentCourses = courses.slice(0, 3);
  const recentUsers = users.filter((u) => u.role === 'student').slice(0, 5);

  const greetHour = new Date().getHours();
  const greeting = greetHour < 12 ? 'Доброе утро' : greetHour < 17 ? 'Добрый день' : 'Добрый вечер';

  return (
    <PageLayout sidebar={<Sidebar />}>
      <Navbar
        title="HR-панель"
        subtitle="LMSSI"
      />

      <div className="flex-1 overflow-y-auto px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {loading ? <DashboardSkeleton /> : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-2">

            {/* Hero Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-8"
            >
              <BentoCard noHover className="relative overflow-hidden min-h-[280px] flex flex-col justify-between border-none" style={{ padding: 0, background: 'none' }}>
                <HeroAura />

                <div className="relative z-10 p-10 flex flex-col h-full justify-between">
                  {/* Greeting badge */}
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5"
                      style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.18)' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                      <span className="text-white/90 text-xs font-bold tracking-widest uppercase">{greeting}</span>
                    </div>

                    {/* Hero heading — larger, tighter */}
                    <h2 style={{ fontSize: '3.2rem', fontWeight: 900, color: 'white', lineHeight: 1, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
                      {user?.full_name?.split(' ')[0]} <span style={{ display: 'inline-block' }}>👋</span>
                    </h2>

                    {/* Stats pills — rgba glass, part of card */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: courses.length, label: 'курсов' },
                        { value: published, label: 'опубликовано' },
                        { value: students, label: 'сотрудников' },
                      ].map((s) => (
                        <div key={s.label}
                          className="flex items-baseline gap-1.5 px-4 py-2 rounded-2xl"
                          style={{
                            background: 'rgba(255,255,255,0.15)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255,255,255,0.25)',
                          }}>
                          <CountUp value={s.value} className="text-white" style={{ fontSize: '1.3rem', fontWeight: 900 }} />
                          <span style={{ color: 'rgba(191,219,254,1)', fontSize: '0.7rem', fontWeight: 600 }}>{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-8 flex-wrap">
                    <button
                      onClick={() => navigate('/hr/courses/new')}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all hover:-translate-y-0.5"
                      style={{ background: 'white', color: '#1e40af', boxShadow: '0 8px 28px rgba(0,0,0,0.18)' }}
                    >
                      <Plus className="w-4 h-4" /> Создать курс
                    </button>
                    <button
                      onClick={() => navigate('/hr/users')}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white transition-all hover:-translate-y-0.5"
                      style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.22)' }}
                    >
                      <Users className="w-4 h-4" /> Сотрудники
                    </button>
                  </div>
                </div>
              </BentoCard>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="md:col-span-4"
            >
              <BentoCard noHover className="p-8 flex flex-col justify-center gap-5 h-full">
                <h3 className="font-extrabold text-slate-700 text-sm uppercase tracking-widest">Сводка</h3>
                <div className="space-y-4">
                  {[
                    { icon: BookOpen, value: courses.length, label: 'Всего курсов', accent: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
                    { icon: TrendingUp, value: published, label: 'Опубликовано', accent: '#059669', bg: 'rgba(5,150,105,0.08)' },
                    { icon: Users, value: students, label: 'Сотрудников', accent: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
                  ].map(({ icon: Icon, value, label, accent, bg }) => (
                    <div key={label} className="flex items-center gap-4 p-3 rounded-2xl transition-colors hover:bg-slate-50">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                        <Icon className="w-5 h-5" style={{ color: accent }} />
                      </div>
                      <div>
                        <CountUp value={value} className="text-2xl font-black text-slate-800 block" />
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </BentoCard>
            </motion.div>

            {/* Recent Courses */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="md:col-span-6"
            >
              <BentoCard noHover className="p-8 h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-extrabold text-slate-800 text-lg">Последние курсы</h3>
                  <button
                    onClick={() => navigate('/hr/courses')}
                    className="flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                  >
                    Все курсы <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-3">
                  {recentCourses.length === 0 && (
                    <p className="text-slate-400 font-medium text-sm">Курсов пока нет</p>
                  )}
                  {recentCourses.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-brand/5 cursor-pointer transition-colors"
                      onClick={() => navigate(`/hr/courses/${c.id}/edit`)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-brand" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{c.title}</p>
                        <p className="text-xs text-slate-400 font-medium">{c.lesson_count} уроков</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {c.is_published ? 'Опубликован' : 'Черновик'}
                      </span>
                    </div>
                  ))}
                </div>
              </BentoCard>
            </motion.div>

            {/* Recent Users */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-6"
            >
              <BentoCard noHover className="p-8 h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-extrabold text-slate-800 text-lg">Сотрудники</h3>
                  <button
                    onClick={() => navigate('/hr/users')}
                    className="flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                  >
                    Все <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-3">
                  {recentUsers.length === 0 && (
                    <p className="text-slate-400 font-medium text-sm">Сотрудников пока нет</p>
                  )}
                  {recentUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center text-brand font-extrabold text-xs shrink-0">
                        {u.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{u.full_name}</p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-300" />
                        <span className="text-[10px] text-slate-400 font-medium">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </BentoCard>
            </motion.div>

          </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
