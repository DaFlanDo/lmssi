import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, BookOpen, Plus, X, CheckCircle, Search, ArrowUp, ArrowDown,
  Building2, Trash2, AlertCircle, Layers,
} from 'lucide-react';
import { apiGet, apiPost, apiDelete, apiPut } from '../lib/api';
import type { Group, CourseShort, CourseListItem } from '../types';
import { PageLayout } from '../components/layout/PageLayout';
import { Sidebar } from '../components/Sidebar';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';

interface CreateForm {
  name: string;
  description: string;
  parent_id: number | undefined;
}

export function PositionsManager() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // course trajectory editor state
  const [attachOpen, setAttachOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [attaching, setAttaching] = useState<string | null>(null);
  const [detaching, setDetaching] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  // tree CRUD (admin)
  const [showModal, setShowModal] = useState(false);
  const [createMode, setCreateMode] = useState<'department' | 'position'>('department');
  const [form, setForm] = useState<CreateForm>({ name: '', description: '', parent_id: undefined });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string; isDept: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const data = await apiGet<Group[]>('/api/groups/');
      setGroups(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    apiGet<CourseListItem[]>('/api/courses/').then(setCourses).catch(console.error);
  }, []);

  const selected = groups.find((g) => g.id === selectedId) ?? null;
  const departments = groups.filter((g) => !g.parent_id);
  const childrenOf = (id: number) => groups.filter((g) => g.parent_id === id);
  const selectedIsDept = selected ? !selected.parent_id : false;

  const applyUpdated = (updated: Group) => {
    setGroups((prev) => prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)));
  };

  const handleAttach = async (courseId: string) => {
    if (!selected) return;
    setAttaching(courseId);
    try {
      const updated = await apiPost<Group>(`/api/groups/${selected.id}/courses`, { course_id: courseId });
      applyUpdated(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setAttaching(null);
    }
  };

  const handleDetach = async (courseId: string) => {
    if (!selected) return;
    setDetaching(courseId);
    try {
      await apiDelete(`/api/groups/${selected.id}/courses/${courseId}`);
      applyUpdated({ ...selected, courses: selected.courses.filter((c) => c.id !== courseId) });
    } catch (e) {
      console.error(e);
    } finally {
      setDetaching(null);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (!selected) return;
    const next = [...selected.courses];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    applyUpdated({ ...selected, courses: next });

    setReordering(true);
    try {
      const updated = await apiPut<Group>(`/api/groups/${selected.id}/courses/reorder`, {
        course_ids: next.map((c) => c.id),
      });
      applyUpdated(updated);
    } catch (e) {
      console.error(e);
      applyUpdated(selected);
    } finally {
      setReordering(false);
    }
  };

  // ── tree CRUD ──
  const openCreateDept = () => {
    setCreateMode('department');
    setForm({ name: '', description: '', parent_id: undefined });
    setFormError('');
    setShowModal(true);
  };

  const openCreatePosition = (parentId?: number) => {
    setCreateMode('position');
    setForm({ name: '', description: '', parent_id: parentId ?? (departments.length === 1 ? departments[0].id : undefined) });
    setFormError('');
    setShowModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createMode === 'position' && !form.parent_id) {
      setFormError('Выберите отдел для должности');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const created = await apiPost<Group>('/api/groups/', form);
      setShowModal(false);
      setForm({ name: '', description: '', parent_id: undefined });
      await load();
      setSelectedId(created.id);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const requestDelete = (id: number, name: string, isDept: boolean) => {
    setDeleteError('');
    setDeleteTarget({ id, name, isDept });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await apiDelete(`/api/groups/${deleteTarget.id}`);
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
      await load();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Ошибка удаления');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const attachedIds = new Set(selected?.courses.map((c) => c.id) ?? []);
  const filteredCourses = courses.filter(
    (c) => !attachedIds.has(c.id) && c.title.toLowerCase().includes(search.toLowerCase())
  );

  const selectNode = (id: number) => {
    setSelectedId(id);
    setAttachOpen(false);
    setSearch('');
  };

  return (
    <PageLayout sidebar={<Sidebar />}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
      </div>

      <div className="flex-1 flex flex-col min-h-0 px-6 pt-6 pb-6 gap-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-none">Профессии</h1>
            <p className="text-slate-400 text-sm font-medium mt-0.5">Отделы, должности и траектории обучения</p>
          </div>
        </div>

        {deleteError && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shrink-0"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-sm text-red-600 font-medium flex-1">{deleteError}</span>
            <button onClick={() => setDeleteError('')}><X className="w-4 h-4 text-red-400" /></button>
          </div>
        )}

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left: hierarchy tree */}
          <div className="w-80 shrink-0 bento-card bg-white/90 backdrop-blur-xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 shrink-0 flex items-center justify-between gap-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Структура</p>
              {isAdmin && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={openCreateDept}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors hover:brightness-95"
                    style={{ background: 'rgba(100,116,139,0.1)', color: '#475569' }}
                  >
                    <Building2 className="w-3.5 h-3.5" /> Отдел
                  </button>
                  <button
                    onClick={() => openCreatePosition()}
                    disabled={departments.length === 0}
                    title={departments.length === 0 ? 'Сначала создайте отдел' : 'Добавить профессию'}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Профессия
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {loading && (
                <div className="py-12 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                </div>
              )}

              {!loading && departments.length === 0 && (
                <EmptyState
                  variant="positions"
                  title="Отделов нет"
                  description={isAdmin ? 'Создайте первый отдел кнопкой выше' : 'Структура появится после добавления администратором'}
                  compact
                />
              )}

              {departments.map((dept) => {
                const kids = childrenOf(dept.id);
                const deptSelected = selectedId === dept.id;
                return (
                  <div key={dept.id}>
                    {/* Department row */}
                    <div className="group flex items-center gap-2">
                      <button
                        onClick={() => selectNode(dept.id)}
                        className={`flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left border ${
                          deptSelected ? 'bg-brand/10 border-brand/20' : 'border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(37,99,235,0.1)' }}>
                          <Building2 className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-extrabold text-slate-700 truncate">{dept.name}</p>
                          <p className="text-[11px] text-slate-400 font-medium">
                            {kids.length} должн. · {dept.course_count} курс.
                          </p>
                        </div>
                      </button>
                      {isAdmin && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => openCreatePosition(dept.id)} title="Добавить должность"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-brand/10 hover:text-brand transition-all">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => requestDelete(dept.id, dept.name, true)} title="Удалить отдел"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Positions under department */}
                    {kids.length > 0 && (
                      <div className="mt-1 ml-3.5 pl-3 border-l border-slate-100 space-y-1">
                        {kids.map((pos) => {
                          const posSelected = selectedId === pos.id;
                          return (
                            <div key={pos.id} className="group flex items-center gap-2">
                              <button
                                onClick={() => selectNode(pos.id)}
                                className={`flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left border ${
                                  posSelected ? 'bg-brand/10 border-brand/20 shadow-sm' : 'border-transparent hover:bg-slate-50'
                                }`}
                              >
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                  posSelected ? 'bg-brand text-white' : 'bg-slate-100 text-slate-400'
                                }`}>
                                  <Briefcase className="w-3 h-3" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-bold truncate ${posSelected ? 'text-brand' : 'text-slate-600'}`}>{pos.name}</p>
                                  <p className="text-[11px] text-slate-400 font-medium">
                                    {pos.user_count} чел. · {pos.course_count} курс.
                                  </p>
                                </div>
                              </button>
                              {isAdmin && (
                                <button onClick={() => requestDelete(pos.id, pos.name, false)} title="Удалить должность"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 shrink-0">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: selected node trajectory */}
          <div className="flex-1 min-w-0 bento-card bg-white/90 backdrop-blur-xl flex flex-col overflow-hidden">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  variant="positions"
                  title="Выберите отдел или должность"
                  description="Слева выберите узел структуры, чтобы настроить его траекторию обучения"
                  compact
                />
              </div>
            ) : (
              <>
                {/* Node header */}
                <div className="shrink-0 border-b border-slate-100 px-6 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                        style={selectedIsDept
                          ? { background: 'rgba(37,99,235,0.1)', color: '#2563eb' }
                          : { background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>
                        {selectedIsDept ? 'Отдел' : 'Должность'}
                      </span>
                      <h2 className="font-black text-slate-900 text-xl truncate">{selected.name}</h2>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">
                      {selectedIsDept
                        ? 'Курсы отдела назначаются всем должностям внутри него'
                        : 'Курсы должности + курсы её отдела выдаются сотруднику автоматически'}
                    </p>
                  </div>
                  <button
                    onClick={() => { setAttachOpen((v) => !v); setSearch(''); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold transition-all shrink-0"
                    style={{
                      background: attachOpen ? 'rgba(37,99,235,0.1)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: attachOpen ? '#2563eb' : 'white',
                      boxShadow: attachOpen ? 'none' : '0 4px 12px rgba(37,99,235,0.3)',
                    }}
                  >
                    <Plus className="w-4 h-4" /> Добавить курс
                  </button>
                </div>

                {/* Attach panel */}
                {attachOpen && (
                  <div className="shrink-0 border-b border-slate-100 px-6 py-4 bg-slate-50/60">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                      Выберите курс для добавления
                    </p>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Поиск курсов..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 font-medium outline-none focus:border-brand/40 transition-colors"
                      />
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {filteredCourses.length === 0 && (
                        <p className="text-slate-400 text-sm font-medium py-2 text-center">
                          {courses.length === 0 ? 'Нет доступных курсов' : 'Все курсы уже добавлены'}
                        </p>
                      )}
                      {filteredCourses.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleAttach(c.id)}
                          disabled={attaching === c.id}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 transition-all text-left disabled:opacity-60"
                        >
                          <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                            <BookOpen className="w-3.5 h-3.5 text-brand" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700 truncate">{c.title}</p>
                            {c.description && <p className="text-xs text-slate-400 truncate">{c.description}</p>}
                          </div>
                          {attaching === c.id
                            ? <div className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin shrink-0" />
                            : <Plus className="w-4 h-4 text-slate-300 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trajectory */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {selected.courses.length === 0 ? (
                    <EmptyState
                      variant="courses"
                      title="Курсов пока нет"
                      description="Нажмите «Добавить курс», чтобы сформировать программу обучения"
                      compact
                    />
                  ) : (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                        Траектория обучения · {selected.courses.length} {selected.courses.length === 1 ? 'этап' : selected.courses.length < 5 ? 'этапа' : 'этапов'}
                      </p>
                      <div className="relative">
                        {selected.courses.length > 1 && (
                          <div className="absolute left-[23px] top-10 bottom-10 w-0.5"
                            style={{ background: 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)' }} />
                        )}
                        <div className="space-y-3">
                          {selected.courses.map((c: CourseShort, index: number) => (
                            <div key={c.id} className="group relative flex items-center gap-4 min-w-0">
                              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 z-10 font-black text-lg"
                                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 4px 14px rgba(37,99,235,0.3)', color: 'white' }}>
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-100 bg-white group-hover:border-brand/20 group-hover:shadow-sm transition-all">
                                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 opacity-60" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-slate-800 truncate">{c.title}</p>
                                  {c.description && <p className="text-sm text-slate-400 truncate mt-0.5">{c.description}</p>}
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-slate-100">
                                  <button onClick={() => handleMove(index, 'up')} disabled={index === 0 || reordering}
                                    className="w-7 h-7 rounded-xl hover:bg-brand/10 hover:text-brand text-slate-300 flex items-center justify-center transition-all disabled:opacity-20 disabled:pointer-events-none"
                                    title="Переместить выше">
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleMove(index, 'down')} disabled={index === selected.courses.length - 1 || reordering}
                                    className="w-7 h-7 rounded-xl hover:bg-brand/10 hover:text-brand text-slate-300 flex items-center justify-center transition-all disabled:opacity-20 disabled:pointer-events-none"
                                    title="Переместить ниже">
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDetach(c.id)} disabled={detaching === c.id}
                                    className="w-7 h-7 rounded-xl hover:bg-red-50 hover:text-red-500 text-slate-300 flex items-center justify-center transition-all disabled:opacity-40"
                                    title="Удалить из траектории">
                                    {detaching === c.id
                                      ? <div className="w-3 h-3 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                                      : <X className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Inherited department courses hint for positions */}
                      {!selectedIsDept && selected.parent_id && (() => {
                        const dept = groups.find((g) => g.id === selected.parent_id);
                        if (!dept || dept.course_count === 0) return null;
                        return (
                          <div className="mt-5 px-4 py-3 rounded-2xl flex items-center gap-3"
                            style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.12)' }}>
                            <Layers className="w-4 h-4 text-brand shrink-0" />
                            <p className="text-xs text-slate-500 font-medium">
                              Плюс <span className="font-bold text-slate-700">{dept.course_count}</span> курс(ов) отдела «{dept.name}» — выдаются автоматически
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create modal (admin) */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-white rounded-[28px] p-8 w-full max-w-md"
              style={{ boxShadow: '0 24px 80px rgba(15,23,42,0.18), 0 0 0 1px rgba(226,232,240,0.6)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">
                    {createMode === 'position' ? 'Новая профессия' : 'Новый отдел'}
                  </h2>
                  <p className="text-sm text-slate-400 font-medium mt-0.5">
                    {createMode === 'position'
                      ? 'Должность внутри отдела'
                      : 'Верхний уровень структуры'}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Название</label>
                  <input
                    type="text" required autoFocus
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={createMode === 'position' ? 'Кладовщик, Пекарь...' : 'Производственный отдел...'}
                    className="w-full px-4 py-3.5 rounded-2xl font-medium text-slate-700 transition-all outline-none"
                    style={{ border: '1.5px solid #e2e8f0', background: '#f8fafc' }}
                    onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.08)'; e.target.style.background = 'white'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Описание <span className="text-slate-300 normal-case font-normal">(необязательно)</span></label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Краткое описание..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-2xl font-medium text-slate-700 transition-all outline-none resize-none"
                    style={{ border: '1.5px solid #e2e8f0', background: '#f8fafc' }}
                    onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.08)'; e.target.style.background = 'white'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; }}
                  />
                </div>

                {createMode === 'position' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Отдел <span className="text-rose-400 normal-case font-bold">*</span></label>
                    <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto -mx-1 px-1 py-0.5">
                      {departments.map((d) => {
                        const active = form.parent_id === d.id;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setForm({ ...form, parent_id: d.id })}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all"
                            style={active
                              ? { background: 'rgba(37,99,235,0.1)', color: '#2563eb', border: '1.5px solid rgba(37,99,235,0.3)' }
                              : { background: '#f8fafc', color: '#64748b', border: '1.5px solid #e2e8f0' }}
                          >
                            <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: active ? '#2563eb' : '#94a3b8' }} />
                            {d.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {formError && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold" style={{ background: 'rgba(239,68,68,0.07)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.14)' }}>
                    <AlertCircle className="w-4 h-4 shrink-0" />{formError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors" style={{ border: '1.5px solid #e2e8f0' }}>
                    Отмена
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-3 rounded-2xl font-bold text-white disabled:opacity-60 transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
                    {submitting ? 'Создаём...' : 'Создать'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget?.isDept ? 'Удалить отдел?' : 'Удалить профессию?'}
        maxWidth="max-w-md"
      >
        <p className="text-slate-600 font-medium mb-6">
          {deleteTarget?.isDept ? 'Отдел' : 'Профессия'}{' '}
          <span className="font-bold text-slate-800">«{deleteTarget?.name}»</span>{' '}
          будет удалён. Это действие нельзя отменить.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteTarget(null)}
            className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={confirmDelete}
            disabled={deleting}
            className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {deleting ? 'Удаляем...' : 'Удалить'}
          </button>
        </div>
      </Modal>
    </PageLayout>
  );
}
