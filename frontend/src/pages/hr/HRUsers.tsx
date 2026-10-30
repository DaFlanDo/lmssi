import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, UserCheck, UserX, BookOpen, Plus, ChevronDown,
  GraduationCap, Trash2, CheckCircle2, Clock, Download, AlertCircle, Calendar,
  BarChart3,
} from 'lucide-react';
import { apiGet, apiPatch, apiPost, apiDelete, getToken, API_BASE_URL } from '../../lib/api';
import type { User, CourseListItem, EnrollmentCreate, UserEnrollmentDetail } from '../../types';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { Navbar } from '../../components/layout/Navbar';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Select } from '../../components/ui/Select';
import { plural } from '../../lib/plural';

export function HRUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [userEnrollments, setUserEnrollments] = useState<Record<number, UserEnrollmentDetail[]>>({});
  const [loadingEnrollments, setLoadingEnrollments] = useState<Set<number>>(new Set());

  const [enrollUser, setEnrollUser] = useState<User | null>(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [enrollDueDate, setEnrollDueDate] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiGet<User[]>('/api/users/'),
      apiGet<CourseListItem[]>('/api/courses/'),
    ])
      .then(([u, c]) => { setUsers(u); setCourses(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const loadUserEnrollments = async (userId: number) => {
    setLoadingEnrollments((prev) => new Set(prev).add(userId));
    try {
      const data = await apiGet<UserEnrollmentDetail[]>(`/api/enrollments/user/${userId}`);
      setUserEnrollments((prev) => ({ ...prev, [userId]: data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEnrollments((prev) => {
        const s = new Set(prev);
        s.delete(userId);
        return s;
      });
    }
  };

  const toggleExpand = (userId: number) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(userId);
      if (!userEnrollments[userId]) {
        loadUserEnrollments(userId);
      }
    }
  };

  const students = users.filter((u) => u.role === 'student');
  const filtered = students.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleActive = async (user: User) => {
    try {
      const updated = await apiPatch<User>(`/api/users/${user.id}`, {
        is_active: !user.is_active,
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = getToken();
      const resp = await fetch(`${API_BASE_URL}/api/enrollments/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lms_report.csv';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handleEnroll = async () => {
    if (!enrollUser || !selectedCourse) return;
    setEnrolling(true);
    setEnrollError('');
    const payload: EnrollmentCreate = {
      user_id: enrollUser.id,
      course_id: selectedCourse,
      due_date: enrollDueDate || null,
    };
    try {
      await apiPost('/api/enrollments/', payload);
      // Перезагружаем список курсов пользователя
      await loadUserEnrollments(enrollUser.id);
      // Раскрываем карточку, чтобы было видно результат
      setExpandedUserId(enrollUser.id);
      setEnrollUser(null);
      setSelectedCourse('');
      setEnrollDueDate('');
    } catch (err: unknown) {
      setEnrollError(err instanceof Error ? err.message : 'Ошибка назначения');
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async (userId: number, enrollmentId: number, courseTitle: string) => {
    if (!confirm(`Отозвать назначение курса «${courseTitle}»?`)) return;
    try {
      await apiDelete(`/api/enrollments/${enrollmentId}`);
      await loadUserEnrollments(userId);
    } catch (err) {
      console.error(err);
      alert('Не удалось отозвать назначение');
    }
  };

  // Опции для селекта курсов: исключаем уже назначенные
  const enrolledCourseIds = new Set(
    enrollUser ? (userEnrollments[enrollUser.id] || []).map((e) => e.course_id) : []
  );
  const courseOptions = courses.map((c) => ({
    value: c.id,
    label: c.title,
    description: c.description?.slice(0, 80) || `${c.module_count} ${plural(c.module_count, 'модуль', 'модуля', 'модулей')} · ${c.lesson_count} ${plural(c.lesson_count, 'урок', 'урока', 'уроков')}`,
    disabled: enrolledCourseIds.has(c.id),
    disabledReason: enrolledCourseIds.has(c.id) ? 'Уже назначен этому сотруднику' : undefined,
  }));

  return (
    <PageLayout sidebar={<Sidebar />}>
      <Navbar
        title="Сотрудники"
        subtitle="HR-панель"
        rightContent={
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-brand/40 hover:text-brand text-slate-700 rounded-2xl font-bold transition-all text-sm disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Формирую...' : 'Отчёт CSV'}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          {/* Stats + search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <Users className="w-4 h-4 text-brand" />
                Всего: <span className="text-slate-900">{students.length}</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                Активных: <span className="text-slate-900">{students.filter((u) => u.is_active).length}</span>
              </div>
            </div>
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по имени или email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-medium text-slate-700 transition-all"
              />
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <EmptyState
              variant="users"
              title="Сотрудников нет"
              description="Зарегистрированные сотрудники с ролью «Сотрудник» появятся здесь."
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((user, i) => {
                const isExpanded = expandedUserId === user.id;
                const enrollments = userEnrollments[user.id] || [];
                const isLoadingEnr = loadingEnrollments.has(user.id);
                const completedCount = enrollments.filter((e) => e.progress_percent === 100).length;

                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bento-card overflow-hidden"
                  >
                    {/* Row */}
                    <div className="p-5 flex items-center gap-4">
                      {/* Expand chevron */}
                      <button
                        onClick={() => toggleExpand(user.id)}
                        className={`w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-all text-slate-400 hover:text-brand shrink-0 ${
                          isExpanded ? 'rotate-180 bg-brand/10 text-brand' : ''
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-2xl bg-brand-light flex items-center justify-center text-brand font-extrabold text-sm shrink-0">
                        {user.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-slate-800 truncate">{user.full_name}</p>
                        <p className="text-sm text-slate-400 font-medium truncate">{user.email}</p>
                        {user.group_name && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-brand bg-brand-light px-2 py-0.5 rounded-lg">
                            <UserCheck className="w-3 h-3" /> {user.group_name}
                          </span>
                        )}
                      </div>

                      {/* Course count badge (если уже загружали) */}
                      {userEnrollments[user.id] && (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 text-xs font-bold text-slate-600">
                          <GraduationCap className="w-3.5 h-3.5 text-brand" />
                          {enrollments.length} {enrollments.length === 1 ? 'курс' : 'курсов'}
                          {completedCount > 0 && (
                            <span className="text-emerald-600">· {completedCount} ✓</span>
                          )}
                        </div>
                      )}

                      {/* Status badge */}
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                        user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {user.is_active ? 'Активен' : 'Отключён'}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEnrollUser(user); setSelectedCourse(''); setEnrollError(''); if (!userEnrollments[user.id]) loadUserEnrollments(user.id); }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-light text-brand font-bold text-sm hover:bg-brand hover:text-white transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Назначить
                        </button>
                        <button
                          onClick={() => toggleActive(user)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                            user.is_active
                              ? 'bg-slate-100 hover:bg-red-100 hover:text-red-500 text-slate-400'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-600'
                          }`}
                          title={user.is_active ? 'Деактивировать' : 'Активировать'}
                        >
                          {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded — enrolled courses */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-slate-100"
                        >
                          <div className="p-5 bg-slate-50/40">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5" /> Назначенные курсы
                              </h4>
                            </div>

                            {isLoadingEnr ? (
                              <div className="py-6 flex justify-center">
                                <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : enrollments.length === 0 ? (
                              <div className="py-6 text-center">
                                <p className="text-sm text-slate-400 font-medium mb-3">Сотруднику пока не назначен ни один курс</p>
                                <button
                                  onClick={() => { setEnrollUser(user); setSelectedCourse(''); setEnrollError(''); }}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-dark transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Назначить первый курс
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {enrollments.map((e) => {
                                  const isDone = e.progress_percent === 100;
                                  return (
                                    <div
                                      key={e.enrollment_id}
                                      className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-brand/30 transition-colors group"
                                    >
                                      <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="flex-1 min-w-0">
                                          <h5 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2">
                                            {e.course_title}
                                          </h5>
                                          <div className="flex items-center gap-2 mt-1.5 text-[11px] font-semibold text-slate-400">
                                            {isDone ? (
                                              <span className="flex items-center gap-1 text-emerald-600">
                                                <CheckCircle2 className="w-3 h-3" /> Завершён
                                              </span>
                                            ) : (
                                              <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {e.completed_lessons}/{e.total_lessons} уроков
                                              </span>
                                            )}
                                          {e.due_date && !isDone && (() => {
                                            const due = new Date(e.due_date);
                                            const overdue = due < new Date();
                                            return (
                                              <span className={`flex items-center gap-1 ${overdue ? 'text-red-500' : 'text-amber-600'}`}>
                                                {overdue ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                                                до {due.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
                                              </span>
                                            );
                                          })()}
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => handleUnenroll(user.id, e.enrollment_id, e.course_title)}
                                          title="Отозвать назначение"
                                          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-all shrink-0"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>

                                      {/* Progress */}
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                              isDone ? 'bg-emerald-500' : 'bg-gradient-to-r from-brand to-blue-400'
                                            }`}
                                            style={{ width: `${e.progress_percent}%` }}
                                          />
                                        </div>
                                        <span className={`text-[11px] font-bold tabular-nums w-9 text-right ${
                                          isDone ? 'text-emerald-600' : 'text-brand'
                                        }`}>
                                          {e.progress_percent}%
                                        </span>
                                      </div>

                                      <button
                                        onClick={() => navigate(`/progress/${user.id}/${e.course_id}`)}
                                        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-50 hover:bg-brand hover:text-white text-slate-500 font-bold text-[12px] transition-colors"
                                      >
                                        <BarChart3 className="w-3.5 h-3.5" /> Подробно о прохождении
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Enroll modal */}
      <Modal
        isOpen={!!enrollUser}
        onClose={() => setEnrollUser(null)}
        title="Назначить курс"
      >
        <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand font-extrabold text-xs shrink-0">
            {enrollUser?.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 truncate">{enrollUser?.full_name}</p>
            <p className="text-xs text-slate-500 font-medium truncate">{enrollUser?.email}</p>
          </div>
        </div>

        <label className="block text-sm font-bold text-slate-700 mb-2">Курс</label>
        <Select
          value={selectedCourse}
          onChange={setSelectedCourse}
          options={courseOptions}
          placeholder="— Выберите курс —"
          emptyText="Нет доступных курсов"
        />

        <label className="block text-sm font-bold text-slate-700 mt-4 mb-2">
          Срок сдачи <span className="text-slate-400 font-medium">(необязательно)</span>
        </label>
        <input
          type="date"
          value={enrollDueDate}
          onChange={(e) => setEnrollDueDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-medium text-slate-700 transition-all"
        />

        {enrollError && (
          <p className="text-red-500 text-sm font-bold mt-4">{enrollError}</p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setEnrollUser(null)}
            className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Отмена
          </button>
          <button
            id="confirm-enroll-btn"
            onClick={handleEnroll}
            disabled={!selectedCourse || enrolling}
            className="flex-1 py-3 rounded-2xl bg-brand text-white font-bold shadow-lg shadow-brand/20 hover:bg-brand-dark transition-colors disabled:opacity-60"
          >
            {enrolling ? 'Назначаем...' : 'Назначить'}
          </button>
        </div>
      </Modal>
    </PageLayout>
  );
}