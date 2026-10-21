import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, Hash, Briefcase, Shield, UserCheck, GraduationCap,
  Save, Lock, Eye, EyeOff, CheckCircle2, KeyRound,
} from 'lucide-react';
import { apiPatch, apiPost } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';
import { PageLayout } from '../components/layout/PageLayout';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/layout/Navbar';
import { BentoCard } from '../components/ui/BentoCard';

const ROLE_META: Record<string, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  admin: { label: 'Администратор', bg: 'rgba(139,92,246,0.1)', color: '#7c3aed', icon: Shield },
  hr: { label: 'HR-менеджер', bg: 'rgba(37,99,235,0.1)', color: '#2563eb', icon: UserCheck },
  student: { label: 'Сотрудник', bg: 'rgba(16,185,129,0.08)', color: '#059669', icon: GraduationCap },
};

const inputClass =
  'w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-medium text-slate-700 transition-all';

function initialsOf(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('');
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();

  // --- Профиль (ФИО) ---
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // --- Смена пароля ---
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (!user) return null;

  const rm = ROLE_META[user.role] ?? ROLE_META.student;
  const RoleIcon = rm.icon;
  const nameChanged = fullName.trim() !== user.full_name && fullName.trim().length > 0;

  const saveName = async () => {
    if (!nameChanged) return;
    setSavingName(true);
    setNameMsg(null);
    try {
      await apiPatch<User>('/api/users/me', { full_name: fullName.trim() });
      await refreshUser();
      setNameMsg({ type: 'ok', text: 'Профиль обновлён' });
    } catch (err) {
      setNameMsg({ type: 'err', text: err instanceof Error ? err.message : 'Ошибка сохранения' });
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async () => {
    setPwMsg(null);
    if (next.length < 6) {
      setPwMsg({ type: 'err', text: 'Новый пароль должен содержать минимум 6 символов' });
      return;
    }
    if (next !== confirm) {
      setPwMsg({ type: 'err', text: 'Пароли не совпадают' });
      return;
    }
    setSavingPw(true);
    try {
      await apiPost('/api/auth/change-password', {
        current_password: current,
        new_password: next,
      });
      setPwMsg({ type: 'ok', text: 'Пароль изменён' });
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setPwMsg({ type: 'err', text: err instanceof Error ? err.message : 'Ошибка смены пароля' });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <PageLayout sidebar={<Sidebar />}>
      <Navbar title="Мой профиль" subtitle="LMSSI" />

      <div className="flex-1 overflow-y-auto px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-2">

            {/* Hero / read-only info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-4"
            >
              <BentoCard noHover className="p-8 flex flex-col items-center text-center gap-5">
                <div
                  className="w-20 h-20 rounded-[28px] flex items-center justify-center font-black text-3xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(37,99,235,0.08))',
                    color: '#2563eb',
                    boxShadow: '0 8px 28px rgba(37,99,235,0.12)',
                  }}
                >
                  {initialsOf(user.full_name)}
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-800 mb-1">{user.full_name}</h2>
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold mt-1"
                    style={{ background: rm.bg, color: rm.color }}
                  >
                    <RoleIcon className="w-3.5 h-3.5" />
                    {rm.label}
                  </span>
                </div>

                <div className="w-full space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(37,99,235,0.07)' }}>
                      <Mail className="w-3.5 h-3.5 text-brand" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</div>
                      <div className="text-sm font-medium text-slate-700 break-all">{user.email}</div>
                    </div>
                  </div>

                  {user.identification_number && (
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(37,99,235,0.07)' }}>
                        <Hash className="w-3.5 h-3.5 text-brand" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Номер</div>
                        <div className="text-sm font-mono font-medium text-slate-700">{user.identification_number}</div>
                      </div>
                    </div>
                  )}

                  {user.group_name && (
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(37,99,235,0.07)' }}>
                        <Briefcase className="w-3.5 h-3.5 text-brand" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Должность</div>
                        <div className="text-sm font-medium text-slate-700">{user.group_name}</div>
                      </div>
                    </div>
                  )}
                </div>
              </BentoCard>
            </motion.div>

            {/* Editable cards */}
            <div className="md:col-span-8 flex flex-col gap-6">

              {/* Edit name */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <BentoCard noHover className="p-7">
                  <div className="flex items-center gap-2 mb-5">
                    <UserCheck className="w-5 h-5 text-brand" />
                    <h3 className="font-extrabold text-slate-800 text-base">Личные данные</h3>
                  </div>

                  <label className="block text-sm font-bold text-slate-700 mb-2">ФИО</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setNameMsg(null); }}
                    className={inputClass}
                    placeholder="Иванов Иван Иванович"
                  />
                  <p className="text-xs text-slate-400 font-medium mt-2">
                    Email и идентификационный номер изменяет администратор.
                  </p>

                  <div className="flex items-center gap-3 mt-5">
                    <button
                      onClick={saveName}
                      disabled={!nameChanged || savingName}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand text-white font-bold text-sm shadow-lg shadow-brand/20 hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:shadow-none"
                    >
                      <Save className="w-4 h-4" />
                      {savingName ? 'Сохраняем...' : 'Сохранить'}
                    </button>
                    {nameMsg && (
                      <span className={`text-sm font-bold flex items-center gap-1.5 ${nameMsg.type === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {nameMsg.type === 'ok' && <CheckCircle2 className="w-4 h-4" />}
                        {nameMsg.text}
                      </span>
                    )}
                  </div>
                </BentoCard>
              </motion.div>

              {/* Change password */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <BentoCard noHover className="p-7">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-brand" />
                      <h3 className="font-extrabold text-slate-800 text-base">Смена пароля</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-brand transition-colors"
                    >
                      {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showPw ? 'Скрыть' : 'Показать'}
                    </button>
                  </div>

                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Текущий пароль</label>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={current}
                        onChange={(e) => { setCurrent(e.target.value); setPwMsg(null); }}
                        className={inputClass}
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Новый пароль</label>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={next}
                        onChange={(e) => { setNext(e.target.value); setPwMsg(null); }}
                        className={inputClass}
                        placeholder="Минимум 6 символов"
                        autoComplete="new-password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Повторите новый пароль</label>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={confirm}
                        onChange={(e) => { setConfirm(e.target.value); setPwMsg(null); }}
                        className={inputClass}
                        placeholder="Повторите пароль"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-5">
                    <button
                      onClick={savePassword}
                      disabled={!current || !next || !confirm || savingPw}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand text-white font-bold text-sm shadow-lg shadow-brand/20 hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:shadow-none"
                    >
                      <Lock className="w-4 h-4" />
                      {savingPw ? 'Меняем...' : 'Сменить пароль'}
                    </button>
                    {pwMsg && (
                      <span className={`text-sm font-bold flex items-center gap-1.5 ${pwMsg.type === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {pwMsg.type === 'ok' && <CheckCircle2 className="w-4 h-4" />}
                        {pwMsg.text}
                      </span>
                    )}
                  </div>
                </BentoCard>
              </motion.div>

            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
