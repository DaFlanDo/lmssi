import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Shield, UserCheck, GraduationCap, Award, BookOpen,
  Mail, Hash, Calendar, CheckCircle2, Clock, ChevronRight, KeyRound,
} from 'lucide-react';
import { apiGet, apiPost } from '../../lib/api';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { Navbar } from '../../components/layout/Navbar';
import { BentoCard } from '../../components/ui/BentoCard';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

interface EnrollmentInfo {
  course_id: string;
  course_title: string;
  assigned_at: string | null;
  progress_percent: number;
  is_completed: boolean;
}

interface CertInfo {
  certificate_number: string;
  course_title: string;
  issued_at: string | null;
  score: number | null;
}

interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  identification_number: string | null;
  role: string;
  is_active: boolean;
  group_id: number | null;
  group_name: string | null;
  created_at: string | null;
  enrollments: EnrollmentInfo[];
  certificates: CertInfo[];
}

const ROLE_META: Record<string, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  admin: { label: 'Администратор', bg: 'rgba(139,92,246,0.1)', color: '#7c3aed', icon: Shield },
  hr: { label: 'HR-менеджер', bg: 'rgba(37,99,235,0.1)', color: '#2563eb', icon: UserCheck },
  student: { label: 'Сотрудник', bg: 'rgba(16,185,129,0.08)', color: '#059669', icon: GraduationCap },
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function ProgressBar({ value }: { value: number }) {
  const color = value === 100 ? '#059669' : value >= 50 ? '#2563eb' : '#94a3b8';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-xs font-black w-9 text-right" style={{ color }}>{value}%</span>
    </div>
  );
}

export function AdminUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Сброс пароля
  const [resetOpen, setResetOpen] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleResetPassword = async () => {
    if (!profile) return;
    if (newPw.length < 6) {
      setResetMsg({ type: 'err', text: 'Минимум 6 символов' });
      return;
    }
    setResetting(true);
    setResetMsg(null);
    try {
      await apiPost(`/api/users/${profile.id}/reset-password`, { new_password: newPw });
      setResetMsg({ type: 'ok', text: 'Пароль сброшен. Передайте новый пароль сотруднику.' });
      setNewPw('');
    } catch (err) {
      setResetMsg({ type: 'err', text: err instanceof Error ? err.message : 'Ошибка сброса' });
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    apiGet<UserProfile>(`/api/users/${userId}/profile`)
      .then(setProfile)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingSpinner fullPage />;

  if (notFound || !profile) {
    return (
      <PageLayout sidebar={<Sidebar />}>
        <Navbar title="Профиль сотрудника" subtitle="LMSSI" />
        <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center px-6">
          <GraduationCap className="w-14 h-14 text-slate-200" />
          <p className="text-xl font-black text-slate-600">Пользователь не найден</p>
          <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
          >
            <ArrowLeft className="w-4 h-4" /> Вернуться
          </button>
        </div>
      </PageLayout>
    );
  }

  const rm = ROLE_META[profile.role] ?? ROLE_META.student;
  const RoleIcon = rm.icon;
  const completedCount = profile.enrollments.filter(e => e.is_completed).length;
  const inProgressCount = profile.enrollments.filter(e => !e.is_completed && e.progress_percent > 0).length;

  return (
    <PageLayout sidebar={<Sidebar />}>
      <Navbar title="Профиль сотрудника" subtitle="LMSSI" />

      <Modal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Сброс пароля"
      >
        <p className="text-sm text-slate-500 font-medium mb-4">
          Задайте новый пароль для <span className="font-bold text-slate-700">{profile.full_name}</span> и
          передайте его сотруднику. Прежний пароль перестанет действовать.
        </p>
        <label className="block text-sm font-bold text-slate-700 mb-2">Новый пароль</label>
        <input
          type="text"
          value={newPw}
          onChange={(e) => { setNewPw(e.target.value); setResetMsg(null); }}
          placeholder="Минимум 6 символов"
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-medium text-slate-700 transition-all"
        />
        {resetMsg && (
          <p className={`text-sm font-bold mt-3 flex items-center gap-1.5 ${resetMsg.type === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
            {resetMsg.type === 'ok' && <CheckCircle2 className="w-4 h-4" />}
            {resetMsg.text}
          </p>
        )}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setResetOpen(false)}
            className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Закрыть
          </button>
          <button
            onClick={handleResetPassword}
            disabled={!newPw || resetting}
            className="flex-1 py-3 rounded-2xl bg-brand text-white font-bold shadow-lg shadow-brand/20 hover:bg-brand-dark transition-colors disabled:opacity-60"
          >
            {resetting ? 'Сбрасываем...' : 'Сбросить пароль'}
          </button>
        </div>
      </Modal>

      <div className="flex-1 overflow-y-auto px-6 pb-20">
        <div className="max-w-7xl mx-auto">

          {/* Back button */}
          <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="mt-2 mb-5">
            <button
              onClick={() => navigate('/admin/users')}
              className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-brand transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Все сотрудники
            </button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* Profile hero card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-4"
            >
              <BentoCard noHover className="p-8 flex flex-col items-center text-center gap-5">
                {/* Avatar */}
                <div
                  className="w-20 h-20 rounded-[28px] flex items-center justify-center font-black text-3xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(37,99,235,0.08))',
                    color: '#2563eb',
                    boxShadow: '0 8px 28px rgba(37,99,235,0.12)',
                  }}
                >
                  {profile.full_name[0]}
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-800 mb-1">{profile.full_name}</h2>
                  {profile.group_name && (
                    <p className="text-sm text-slate-400 font-medium">{profile.group_name}</p>
                  )}
                </div>

                {/* Role badge */}
                <span
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold"
                  style={{ background: rm.bg, color: rm.color }}
                >
                  <RoleIcon className="w-3.5 h-3.5" />
                  {rm.label}
                </span>

                {/* Status */}
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                  style={
                    profile.is_active
                      ? { background: 'rgba(16,185,129,0.08)', color: '#059669' }
                      : { background: 'rgba(100,116,139,0.08)', color: '#64748b' }
                  }
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${profile.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                  {profile.is_active ? 'Активен' : 'Заблокирован'}
                </span>

                {/* Meta info */}
                <div className="w-full space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(37,99,235,0.07)' }}>
                      <Mail className="w-3.5 h-3.5 text-brand" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</div>
                      <div className="text-sm font-medium text-slate-700 break-all">{profile.email}</div>
                    </div>
                  </div>

                  {profile.identification_number && (
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(37,99,235,0.07)' }}>
                        <Hash className="w-3.5 h-3.5 text-brand" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Номер</div>
                        <div className="text-sm font-mono font-medium text-slate-700">{profile.identification_number}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(37,99,235,0.07)' }}>
                      <Calendar className="w-3.5 h-3.5 text-brand" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Зарегистрирован</div>
                      <div className="text-sm font-medium text-slate-700">{formatDate(profile.created_at)}</div>
                    </div>
                  </div>
                </div>

                <div className="w-full flex flex-col gap-2 mt-1">
                  <button
                    onClick={() => { setResetOpen(true); setNewPw(''); setResetMsg(null); }}
                    className="w-full py-2.5 rounded-2xl font-bold text-sm transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    style={{ background: 'rgba(217,119,6,0.08)', color: '#d97706', border: '1px solid rgba(217,119,6,0.16)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(217,119,6,0.14)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(217,119,6,0.08)')}
                  >
                    <KeyRound className="w-3.5 h-3.5" /> Сбросить пароль
                  </button>
                  <button
                    onClick={() => navigate('/admin/users')}
                    className="w-full py-2.5 rounded-2xl font-bold text-sm transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.16)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.14)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.08)')}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Назад к списку
                  </button>
                </div>
              </BentoCard>
            </motion.div>

            {/* Right column */}
            <div className="md:col-span-8 flex flex-col gap-6">

              {/* Stats mini row */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="grid grid-cols-3 gap-4"
              >
                {[
                  { icon: BookOpen, value: profile.enrollments.length, label: 'Курсов назначено', accent: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
                  { icon: CheckCircle2, value: completedCount, label: 'Завершено', accent: '#059669', bg: 'rgba(16,185,129,0.08)' },
                  { icon: Award, value: profile.certificates.length, label: 'Сертификатов', accent: '#d97706', bg: 'rgba(217,119,6,0.08)' },
                ].map(s => (
                  <BentoCard key={s.label} className="p-5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
                      <s.icon className="w-4 h-4" style={{ color: s.accent }} />
                    </div>
                    <div className="text-2xl font-black text-slate-800">{s.value}</div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{s.label}</div>
                  </BentoCard>
                ))}
              </motion.div>

              {/* Courses */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.13 }}
              >
                <BentoCard noHover className="p-7">
                  <div className="flex items-center gap-2 mb-6">
                    <BookOpen className="w-5 h-5 text-brand" />
                    <h3 className="font-extrabold text-slate-800 text-base">Назначенные курсы</h3>
                    {inProgressCount > 0 && (
                      <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>
                        {inProgressCount} в процессе
                      </span>
                    )}
                  </div>

                  {profile.enrollments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <BookOpen className="w-10 h-10 mb-3 text-slate-200" />
                      <p className="text-sm font-bold text-slate-400">Курсы не назначены</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {profile.enrollments.map((enr, i) => (
                        <motion.button
                          key={enr.course_id}
                          type="button"
                          onClick={() => navigate(`/progress/${profile.id}/${enr.course_id}`)}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 + i * 0.04 }}
                          className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-brand/30 hover:bg-blue-50/20 transition-all group"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: enr.is_completed ? 'rgba(16,185,129,0.1)' : 'rgba(37,99,235,0.08)' }}>
                                {enr.is_completed
                                  ? <CheckCircle2 className="w-4 h-4" style={{ color: '#059669' }} />
                                  : <Clock className="w-4 h-4" style={{ color: '#2563eb' }} />
                                }
                              </div>
                              <span className="font-bold text-sm text-slate-800 truncate">{enr.course_title}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className="text-[10px] font-black px-2 py-1 rounded-xl"
                                style={enr.is_completed
                                  ? { background: 'rgba(16,185,129,0.08)', color: '#059669' }
                                  : { background: 'rgba(37,99,235,0.07)', color: '#64748b' }
                                }
                              >
                                {enr.is_completed ? 'Завершён' : enr.progress_percent > 0 ? 'В процессе' : 'Не начат'}
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand transition-colors" />
                            </div>
                          </div>
                          <ProgressBar value={enr.progress_percent} />
                          <div className="flex items-center justify-between mt-2">
                            {enr.assigned_at ? (
                              <div className="text-[10px] text-slate-300 font-medium">
                                Назначен: {formatDate(enr.assigned_at)}
                              </div>
                            ) : <span />}
                            <span className="text-[10px] font-bold text-slate-300 group-hover:text-brand transition-colors">
                              Подробно →
                            </span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </BentoCard>
              </motion.div>

              {/* Certificates */}
              {profile.certificates.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                >
                  <BentoCard noHover className="p-7">
                    <div className="flex items-center gap-2 mb-6">
                      <Award className="w-5 h-5" style={{ color: '#d97706' }} />
                      <h3 className="font-extrabold text-slate-800 text-base">Сертификаты</h3>
                    </div>
                    <div className="space-y-3">
                      {profile.certificates.map((cert, i) => (
                        <motion.div
                          key={cert.certificate_number}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.25 + i * 0.05 }}
                          className="flex items-center gap-4 p-4 rounded-2xl transition-all"
                          style={{ background: 'rgba(217,119,6,0.04)', border: '1px solid rgba(217,119,6,0.1)' }}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(217,119,6,0.1)' }}
                          >
                            <Award className="w-5 h-5" style={{ color: '#d97706' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-slate-800 truncate">{cert.course_title}</div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-[10px] font-mono font-bold text-slate-400">{cert.certificate_number}</span>
                              {cert.score !== null && (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-lg" style={{ background: 'rgba(217,119,6,0.1)', color: '#d97706' }}>
                                  {cert.score}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[10px] text-slate-400 font-medium">{formatDate(cert.issued_at)}</div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-auto mt-1" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </BentoCard>
                </motion.div>
              )}

            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
