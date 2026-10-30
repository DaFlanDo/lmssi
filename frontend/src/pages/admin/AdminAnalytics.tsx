import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, BookOpen, Award, Briefcase, TrendingUp,
  GraduationCap, UserCheck, Shield, ArrowRight, BarChart3,
} from 'lucide-react';
import { apiGet } from '../../lib/api';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { Navbar } from '../../components/layout/Navbar';
import { BentoCard } from '../../components/ui/BentoCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

interface RecentUser {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
}

interface TopCourse {
  id: string;
  title: string;
  enrollment_count: number;
}

interface Analytics {
  total_users: number;
  active_users: number;
  by_role: { admin: number; hr: number; student: number };
  total_enrollments: number;
  total_certificates: number;
  total_groups: number;
  recent_users: RecentUser[];
  top_courses: TopCourse[];
}

const ROLE_META: Record<string, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  admin: { label: 'Администратор', bg: 'rgba(139,92,246,0.1)', color: '#7c3aed', icon: Shield },
  hr: { label: 'HR-менеджер', bg: 'rgba(37,99,235,0.1)', color: '#2563eb', icon: UserCheck },
  student: { label: 'Сотрудник', bg: 'rgba(16,185,129,0.08)', color: '#059669', icon: GraduationCap },
};

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Сегодня';
  if (days === 1) return 'Вчера';
  if (days < 7) return `${days} дн. назад`;
  if (days < 30) return `${Math.floor(days / 7)} нед. назад`;
  return `${Math.floor(days / 30)} мес. назад`;
}

export function AdminAnalytics() {
  const navigate = useNavigate();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Analytics>('/api/users/analytics')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner fullPage />;
  if (!data) return null;

  const activePercent = data.total_users > 0 ? Math.round((data.active_users / data.total_users) * 100) : 0;
  const maxEnrollments = Math.max(...data.top_courses.map(c => c.enrollment_count), 1);

  const bigStats = [
    { icon: Users, value: data.total_users, label: 'Всего сотрудников', accent: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
    { icon: BookOpen, value: data.total_enrollments, label: 'Зачислений на курсы', accent: '#0891b2', bg: 'rgba(8,145,178,0.08)' },
    { icon: Award, value: data.total_certificates, label: 'Сертификатов выдано', accent: '#d97706', bg: 'rgba(217,119,6,0.08)' },
    { icon: Briefcase, value: data.total_groups, label: 'Профессий/отделов', accent: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
  ];

  return (
    <PageLayout sidebar={<Sidebar />}>
      <Navbar title="Аналитика" subtitle="LMSSI" />

      <div className="flex-1 overflow-y-auto px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-2">

            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-8"
            >
              <BentoCard noHover className="relative overflow-hidden min-h-[220px] flex flex-col justify-between border-none" style={{ padding: 0, background: 'none' }}>
                <div className="absolute inset-0 rounded-[28px] overflow-hidden">
                  <div style={{
                    background: 'linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 40%, #2563eb 70%, #3b82f6 100%)',
                    position: 'absolute', inset: 0,
                  }} />
                  <div style={{
                    position: 'absolute', top: '-60px', right: '-40px',
                    width: '380px', height: '380px',
                    background: 'radial-gradient(circle, rgba(147,197,253,0.35) 0%, transparent 70%)',
                  }} />
                </div>
                <div className="relative z-10 p-8 flex flex-col h-full justify-between">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                      <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white/80 text-sm font-bold tracking-widest uppercase">Аналитика платформы</span>
                  </div>
                  <div>
                    <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-0.02em', marginBottom: '1rem' }}>
                      Обзор активности
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: `${activePercent}%`, label: 'активных' },
                        { value: data.by_role.student, label: 'сотрудников' },
                        { value: data.by_role.hr, label: 'HR-менеджеров' },
                      ].map(s => (
                        <div
                          key={s.label}
                          className="flex items-baseline gap-1.5 px-4 py-2 rounded-2xl"
                          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)' }}
                        >
                          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>{s.value}</span>
                          <span style={{ color: 'rgba(191,219,254,1)', fontSize: '0.68rem', fontWeight: 600 }}>{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </BentoCard>
            </motion.div>

            {/* Активность */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="md:col-span-4"
            >
              <BentoCard noHover className="p-7 flex flex-col gap-5 h-full justify-center">
                <h3 className="font-extrabold text-slate-700 text-sm uppercase tracking-widest">По ролям</h3>
                <div className="space-y-3">
                  {[
                    { role: 'student', count: data.by_role.student, total: data.total_users },
                    { role: 'hr', count: data.by_role.hr, total: data.total_users },
                    { role: 'admin', count: data.by_role.admin, total: data.total_users },
                  ].map(({ role, count, total }) => {
                    const rm = ROLE_META[role];
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={role}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-500">{rm.label}</span>
                          <span className="text-xs font-black text-slate-700">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: rm.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
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

            {/* Top courses */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-5"
            >
              <BentoCard noHover className="p-7 h-full">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-brand" />
                  <h3 className="font-extrabold text-slate-800 text-base">Топ курсов по зачислениям</h3>
                </div>
                {data.top_courses.length === 0 ? (
                  <div className="text-sm text-slate-400 font-medium text-center py-8">Курсов ещё нет</div>
                ) : (
                  <div className="space-y-4">
                    {data.top_courses.map((c, i) => {
                      const barW = Math.round((c.enrollment_count / maxEnrollments) * 100);
                      return (
                        <div key={c.id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-black text-slate-300 w-5 shrink-0">#{i + 1}</span>
                              <span className="text-sm font-bold text-slate-700 truncate">{c.title}</span>
                            </div>
                            <span className="text-xs font-black text-slate-500 ml-3 shrink-0">{c.enrollment_count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${barW}%` }}
                              transition={{ delay: 0.4 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ background: 'linear-gradient(90deg, #3b82f6, #2563eb)' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </BentoCard>
            </motion.div>

            {/* Recent users */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="md:col-span-7"
            >
              <BentoCard noHover className="p-7 h-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand" />
                    <h3 className="font-extrabold text-slate-800 text-base">Последние регистрации</h3>
                  </div>
                  <button
                    onClick={() => navigate('/admin/users')}
                    className="flex items-center gap-1.5 text-xs font-bold text-brand hover:underline transition-colors"
                  >
                    Все сотрудники <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {data.recent_users.length === 0 ? (
                  <div className="text-sm text-slate-400 font-medium text-center py-8">Пользователей нет</div>
                ) : (
                  <div className="space-y-1">
                    {data.recent_users.map((u, i) => {
                      const rm = ROLE_META[u.role] ?? ROLE_META.student;
                      const RoleIcon = rm.icon;
                      return (
                        <motion.div
                          key={u.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 + i * 0.04 }}
                          onClick={() => navigate(`/admin/users/${u.id}`)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all hover:bg-slate-50 group"
                        >
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                            style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(37,99,235,0.07))', color: '#2563eb' }}
                          >
                            {u.full_name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-800 text-sm group-hover:text-brand transition-colors truncate">{u.full_name}</div>
                            <div className="text-xs text-slate-400 truncate">{u.email}</div>
                          </div>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold shrink-0"
                            style={{ background: rm.bg, color: rm.color }}
                          >
                            <RoleIcon className="w-2.5 h-2.5" />
                            {rm.label}
                          </span>
                          <span className="text-[10px] text-slate-300 font-medium shrink-0 hidden lg:block">
                            {timeAgo(u.created_at)}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-200 group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0" />
                        </motion.div>
                      );
                    })}
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
