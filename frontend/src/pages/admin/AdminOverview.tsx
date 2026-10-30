import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Briefcase, UserCheck, BookOpen, ArrowRight, TrendingUp, Shield, Award, GraduationCap } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { Navbar } from '../../components/layout/Navbar';
import { BentoCard } from '../../components/ui/BentoCard';
import { HeroAura } from '../../components/ui/HeroAura';
import { CountUp } from '../../components/ui/CountUp';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { plural } from '../../lib/plural';

interface Analytics {
  total_users: number;
  active_users: number;
  by_role: { admin: number; hr: number; student: number };
  total_enrollments: number;
  total_certificates: number;
  total_groups: number;
  top_courses: { id: number; title: string; enrollment_count: number }[];
}

// Сегментированный донат «состав команды». Светлые тинты ролевых цветов — читаются на синем hero.
function RoleDonut({ admin, hr, student }: { admin: number; hr: number; student: number }) {
  const total = admin + hr + student;
  const size = 172;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const segments = [
    { value: student, color: '#6ee7b7' },
    { value: hr, color: '#93c5fd' },
    { value: admin, color: '#c4b5fd' },
  ];

  let acc = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={stroke} />
        {total > 0 &&
          segments.map((s, i) => {
            const len = (s.value / total) * c;
            const el = (
              <motion.circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeLinecap="butt"
                strokeDasharray={`${len} ${c - len}`}
                initial={{ strokeDashoffset: 0, opacity: 0 }}
                animate={{ strokeDashoffset: -acc, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.5 }}
              />
            );
            acc += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <CountUp value={total} className="leading-none" style={{ fontSize: '2rem', fontWeight: 900 }} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 mt-1">в команде</span>
      </div>
    </div>
  );
}

export function AdminOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Analytics>('/api/users/analytics')
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const greetHour = now.getHours();
  const greeting = greetHour < 12 ? 'Доброе утро' : greetHour < 17 ? 'Добрый день' : 'Добрый вечер';
  const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const dateLabel = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  const roleLegend = stats
    ? [
        { label: 'Сотрудникы', value: stats.by_role.student, color: '#6ee7b7' },
        { label: 'HR-менеджеры', value: stats.by_role.hr, color: '#93c5fd' },
        { label: 'Администраторы', value: stats.by_role.admin, color: '#c4b5fd' },
      ]
    : [];

  const maxEnroll = stats ? Math.max(1, ...stats.top_courses.map((c) => c.enrollment_count)) : 1;

  return (
    <PageLayout sidebar={<Sidebar />}>
      <Navbar title="Панель администратора" subtitle="LMSSI" />

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
              <BentoCard noHover className="relative overflow-hidden min-h-[300px] h-full flex flex-col justify-between border-none" style={{ padding: 0, background: 'none' }}>
                <HeroAura />

                <div className="relative z-10 p-10 flex items-center h-full gap-10">
                  {/* Левая колонка — приветствие */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <div
                      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 self-start"
                      style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.18)' }}
                    >
                      <Shield className="w-3 h-3 text-white/80" />
                      <span className="text-white/90 text-xs font-bold tracking-widest uppercase">{greeting}, администратор</span>
                    </div>

                    <h2 style={{ fontSize: 'clamp(2rem, 2.6vw, 3rem)', fontWeight: 900, color: 'white', lineHeight: 1.05, letterSpacing: '-0.02em', overflowWrap: 'anywhere' }}>
                      {user?.full_name?.split(' ')[0]}
                    </h2>
                    <p className="mt-3 text-sm font-medium text-white/55">{dateLabel}</p>
                  </div>

                  {/* Правая колонка — донат состава команды */}
                  {stats && (
                    <div className="hidden lg:flex items-center gap-6 shrink-0">
                      <RoleDonut admin={stats.by_role.admin} hr={stats.by_role.hr} student={stats.by_role.student} />
                      <div className="space-y-2.5">
                        {roleLegend.map((r) => (
                          <div key={r.label} className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
                            <span className="text-white font-black text-sm tabular-nums w-5">{r.value}</span>
                            <span className="text-white/70 text-xs font-medium">{r.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </BentoCard>
            </motion.div>

            {/* Stats sidebar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="md:col-span-4"
            >
              <BentoCard noHover className="p-7 flex flex-col h-full">
                <h3 className="font-extrabold text-slate-700 text-sm uppercase tracking-widest mb-5">Сводка</h3>
                <div className="grid grid-cols-2 gap-3">
                  {stats && [
                    { icon: Users, value: stats.total_users, label: 'Всего сотрудников', accent: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
                    { icon: UserCheck, value: stats.active_users, label: 'Активных', accent: '#059669', bg: 'rgba(5,150,105,0.08)' },
                    { icon: GraduationCap, value: stats.total_enrollments, label: 'Записей на курсы', accent: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
                    { icon: Award, value: stats.total_certificates, label: 'Сертификатов', accent: '#0891b2', bg: 'rgba(8,145,178,0.08)' },
                  ].map(({ icon: Icon, value, label, accent, bg }) => (
                    <div key={label} className="flex flex-col gap-2.5 p-4 rounded-2xl border border-slate-100 transition-colors hover:bg-slate-50">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                        <Icon className="w-[18px] h-[18px]" style={{ color: accent }} />
                      </div>
                      <div>
                        <CountUp value={value} className="text-2xl font-black text-slate-800 block leading-none" />
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-1">{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </BentoCard>
            </motion.div>

            {/* Top courses */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="md:col-span-7"
            >
              <BentoCard noHover className="p-8 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  <BookOpen className="w-5 h-5 text-brand" />
                  <h3 className="font-extrabold text-slate-800 text-lg">Популярные курсы</h3>
                </div>
                {stats && stats.top_courses.length > 0 ? (
                  <div className="space-y-2 flex-1 flex flex-col justify-between">
                    {stats.top_courses.map((course, i) => (
                      <div
                        key={course.id}
                        onClick={() => navigate('/hr/courses')}
                        className="flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-colors hover:bg-slate-50 group"
                      >
                        <span className="cert-serif text-lg text-slate-300 w-6 text-center shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-800 text-sm truncate group-hover:text-brand transition-colors">{course.title}</div>
                          <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: 'linear-gradient(90deg, var(--color-brand), color-mix(in srgb, var(--color-brand) 55%, white))' }}
                              initial={{ width: 0 }}
                              animate={{ width: `${(course.enrollment_count / maxEnroll) * 100}%` }}
                              transition={{ delay: 0.2 + i * 0.08, duration: 0.6 }}
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-slate-800 tabular-nums">{course.enrollment_count}</span>
                          <span className="text-xs text-slate-400 ml-1">{plural(course.enrollment_count, 'запись', 'записи', 'записей')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 font-medium py-6 text-center">Пока нет курсов с записями</p>
                )}
              </BentoCard>
            </motion.div>

            {/* Quick links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-5"
            >
              <BentoCard noHover className="p-8 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-brand" />
                  <h3 className="font-extrabold text-slate-800 text-lg">Быстрые действия</h3>
                </div>
                <div className="flex flex-col gap-3 flex-1">
                  {[
                    { label: 'Управление сотрудниками', desc: 'Роли, статусы, специальности', href: '/admin/users', icon: Users, accent: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
                    { label: 'Управление профессиями', desc: 'Отделы и специальности', href: '/admin/groups', icon: Briefcase, accent: '#7c3aed', bg: 'rgba(139,92,246,0.08)' },
                    { label: 'Все курсы системы', desc: 'Просмотр и редактирование', href: '/hr/courses', icon: BookOpen, accent: '#0891b2', bg: 'rgba(8,145,178,0.08)' },
                  ].map((item) => (
                    <div
                      key={item.href}
                      onClick={() => navigate(item.href)}
                      className="flex items-center gap-4 p-4 flex-1 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition-all group"
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: item.bg }}>
                        <item.icon className="w-5 h-5" style={{ color: item.accent }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-sm group-hover:text-brand transition-colors">{item.label}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand group-hover:translate-x-1 transition-all shrink-0" />
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
