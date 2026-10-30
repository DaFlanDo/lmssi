import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, UserCheck, GraduationCap, ChevronDown, X, AlertCircle, Trash2, Eye, Check, Briefcase } from 'lucide-react';
import { apiGet, apiPatch, apiDelete } from '../../lib/api';
import type { User, Group } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { Navbar } from '../../components/layout/Navbar';
import { BentoCard } from '../../components/ui/BentoCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';

const ROLE_META: Record<string, { label: string; bg: string; color: string; icon: React.ElementType }> = {
  admin: { label: 'Администратор', bg: 'rgba(139,92,246,0.1)', color: '#7c3aed', icon: Shield },
  hr: { label: 'HR-менеджер', bg: 'rgba(37,99,235,0.1)', color: '#2563eb', icon: UserCheck },
  student: { label: 'Сотрудник', bg: 'rgba(16,185,129,0.08)', color: '#059669', icon: GraduationCap },
};

interface FancyOption {
  value: string;
  label: string;
  icon?: React.ElementType;
  color?: string;
  bg?: string;
}

function FancySelect({ value, options, onChange, placeholder = '— Не указано' }: {
  value: string;
  options: FancyOption[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);
  const SelIcon = selected?.icon;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3.5 rounded-2xl text-sm outline-none transition-all"
        style={{ border: `1.5px solid ${open ? '#2563eb' : '#e2e8f0'}`, background: open ? 'white' : '#f8fafc' }}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          {SelIcon && (
            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: selected?.bg ?? 'rgba(100,116,139,0.1)' }}>
              <SelIcon className="w-3.5 h-3.5" style={{ color: selected?.color ?? '#64748b' }} />
            </span>
          )}
          <span className={`truncate ${selected ? 'text-slate-800 font-semibold' : 'text-slate-400 font-medium'}`}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-100 shadow-xl overflow-hidden"
          >
            <div className="py-1 max-h-60 overflow-y-auto">
              {options.map(o => {
                const Icon = o.icon;
                const active = o.value === value;
                return (
                  <button
                    key={o.value || '__empty'}
                    type="button"
                    onClick={() => { onChange(o.value); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${active ? 'font-bold' : 'text-slate-700 hover:bg-slate-50 font-medium'}`}
                    style={active ? { background: 'rgba(37,99,235,0.06)', color: '#2563eb' } : undefined}
                  >
                    {Icon && (
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: o.bg ?? 'rgba(100,116,139,0.1)' }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: o.color ?? '#64748b' }} />
                      </span>
                    )}
                    <span className="truncate flex-1">{o.label}</span>
                    {active && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AdminUsers() {
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editing, setEditing] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ role: '', group_id: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = async () => {
    try {
      const [u, g] = await Promise.all([
        apiGet<User[]>('/api/users/'),
        apiGet<Group[]>('/api/groups/'),
      ]);
      setUsers(u);
      setGroups(g);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const specialties = groups.filter(g => g.parent_id);

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.identification_number ?? '').toLowerCase().includes(q)
    );
  });

  const openEdit = (u: User) => {
    setEditing(u);
    setEditForm({ role: u.role, group_id: String(u.group_id ?? ''), is_active: u.is_active });
    setSaveError('');
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setSaveError('');
    try {
      await apiPatch<User>(`/api/users/${editing.id}`, {
        role: editForm.role,
        group_id: editForm.group_id ? Number(editForm.group_id) : null,
        is_active: editForm.is_active,
      });
      setEditing(null);
      load();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (!confirm(`Удалить ${u.full_name}? Действие необратимо.`)) return;
    try {
      await apiDelete(`/api/users/${u.id}`);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  const filterButtons = [
    { key: 'all', label: 'Все', count: users.length },
    { key: 'admin', label: 'Админы', count: users.filter(u => u.role === 'admin').length },
    { key: 'hr', label: 'HR', count: users.filter(u => u.role === 'hr').length },
    { key: 'student', label: 'Сотрудникы', count: users.filter(u => u.role === 'student').length },
  ];

  return (
    <PageLayout sidebar={<Sidebar />}>
      <Navbar
        title="Сотрудники"
        subtitle="LMSSI"
      />

      <div className="flex-1 overflow-y-auto px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 gap-6 mt-2">

            {/* Filters row */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Имя, email, номер..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm font-medium text-slate-700 outline-none transition-all"
                  style={{ background: 'white', border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                  onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.08)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
                />
              </div>
              {/* Role filters */}
              <div className="flex gap-2">
                {filterButtons.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setRoleFilter(f.key)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
                    style={
                      roleFilter === f.key
                        ? { background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }
                        : { background: 'white', color: '#64748b', border: '1.5px solid #e2e8f0' }
                    }
                  >
                    {f.label}
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-lg font-black"
                      style={roleFilter === f.key ? { background: 'rgba(255,255,255,0.25)', color: 'white' } : { background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}
                    >
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Table */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <BentoCard noHover className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {['Сотрудник', 'Роль', 'Должность', 'Статус', ''].map(h => (
                          <th key={h} className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest first:pl-7 last:pr-7">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((u, i) => {
                        const rm = ROLE_META[u.role] ?? ROLE_META.student;
                        const RoleIcon = rm.icon;
                        return (
                          <motion.tr
                            key={u.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.025 }}
                            style={{ borderBottom: '1px solid rgba(241,245,249,0.8)' }}
                            className="hover:bg-slate-50/60 transition-colors"
                          >
                            {/* Person */}
                            <td className="pl-7 pr-4 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm"
                                  style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(37,99,235,0.07))', color: '#2563eb' }}
                                >
                                  {u.full_name[0]}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-800 text-sm">{u.full_name}</div>
                                  <div className="text-xs text-slate-400 font-medium">{u.email}</div>
                                  {u.identification_number && (
                                    <div className="text-[10px] text-slate-300 font-mono tracking-wider mt-0.5">{u.identification_number}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            {/* Role */}
                            <td className="px-4 py-4">
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold"
                                style={{ background: rm.bg, color: rm.color }}
                              >
                                <RoleIcon className="w-3 h-3" />
                                {rm.label}
                              </span>
                            </td>
                            {/* Position (группа = должность) */}
                            <td className="px-4 py-4">
                              <span className="text-sm text-slate-500 font-medium">{u.group_name || '—'}</span>
                            </td>
                            {/* Status */}
                            <td className="px-4 py-4">
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold"
                                style={
                                  u.is_active
                                    ? { background: 'rgba(16,185,129,0.08)', color: '#059669' }
                                    : { background: 'rgba(100,116,139,0.08)', color: '#64748b' }
                                }
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                                {u.is_active ? 'Активен' : 'Заблокирован'}
                              </span>
                            </td>
                            {/* Actions */}
                            <td className="px-4 pr-7 py-4">
                              <div className="flex items-center gap-1 justify-end">
                                <button
                                  onClick={() => navigate(`/admin/users/${u.id}`)}
                                  className="p-1.5 rounded-xl transition-colors hover:bg-blue-50 group"
                                  title="Просмотр профиля"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand transition-colors" />
                                </button>
                                {u.id !== me?.id && (
                                  <>
                                    <button
                                      onClick={() => openEdit(u)}
                                      className="px-3 py-1.5 text-xs font-bold rounded-xl transition-colors"
                                      style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}
                                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.14)')}
                                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.08)')}
                                    >
                                      Изменить
                                    </button>
                                    <button
                                      onClick={() => handleDelete(u)}
                                      className="p-1.5 rounded-xl transition-colors hover:bg-red-50 group"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-red-400 transition-colors" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filtered.length === 0 && (
                    <EmptyState
                      variant="search"
                      title="Пользователи не найдены"
                      description="По выбранным фильтрам результатов нет. Попробуйте изменить критерии поиска."
                      compact
                    />
                  )}
                </div>
              </BentoCard>
            </motion.div>

          </div>
        </div>
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-white rounded-[28px] p-8 w-full max-w-md"
              style={{ boxShadow: '0 24px 80px rgba(15,23,42,0.18), 0 0 0 1px rgba(226,232,240,0.6)' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0"
                    style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(37,99,235,0.07))', color: '#2563eb' }}
                  >
                    {editing.full_name[0]}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800">{editing.full_name}</h2>
                    <p className="text-xs text-slate-400 font-medium">{editing.email}</p>
                  </div>
                </div>
                <button onClick={() => setEditing(null)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Role */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Роль</label>
                  <FancySelect
                    value={editForm.role}
                    onChange={v => setEditForm({ ...editForm, role: v })}
                    options={[
                      { value: 'student', ...ROLE_META.student },
                      { value: 'hr', ...ROLE_META.hr },
                      { value: 'admin', ...ROLE_META.admin },
                    ]}
                  />
                </div>

                {/* Position (должность из иерархии групп) */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Должность</label>
                  <FancySelect
                    value={editForm.group_id}
                    onChange={v => setEditForm({ ...editForm, group_id: v })}
                    placeholder="— Не указана"
                    options={[
                      { value: '', label: '— Не указана' },
                      ...specialties.map(g => ({
                        value: String(g.id),
                        label: g.name,
                        icon: Briefcase,
                        color: '#2563eb',
                        bg: 'rgba(37,99,235,0.1)',
                      })),
                    ]}
                  />
                  <p className="text-[11px] text-slate-400 font-medium mt-1.5 leading-snug">
                    При назначении должности сотрудник автоматически записывается на все курсы её программы (курсы должности + курсы отдела).
                  </p>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Статус аккаунта</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: true, label: 'Активен' },
                      { v: false, label: 'Заблокирован' },
                    ].map(opt => (
                      <button
                        key={String(opt.v)}
                        onClick={() => setEditForm({ ...editForm, is_active: opt.v })}
                        className="py-3 rounded-2xl text-sm font-bold transition-all"
                        style={
                          editForm.is_active === opt.v
                            ? { background: 'rgba(37,99,235,0.1)', color: '#2563eb', border: '1.5px solid rgba(37,99,235,0.25)' }
                            : { background: '#f8fafc', color: '#64748b', border: '1.5px solid #e2e8f0' }
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {saveError && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold" style={{ background: 'rgba(239,68,68,0.07)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.14)' }}>
                    <AlertCircle className="w-4 h-4 shrink-0" />{saveError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setEditing(null)}
                    className="flex-1 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                    style={{ border: '1.5px solid #e2e8f0' }}
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-3 rounded-2xl font-bold text-white disabled:opacity-60 transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}
                  >
                    {saving ? 'Сохраняем...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
