import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Sparkles, Users, User, CheckCircle } from 'lucide-react';
import { apiGet, apiDelete, apiPost } from '../../lib/api';
import type { CourseListItem, Group, GroupEnrollmentResult, User as AppUser } from '../../types';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { Navbar } from '../../components/layout/Navbar';
import { CourseCard } from '../../components/ui/CourseCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';

// ── Assign modal ──────────────────────────────────────────────────────────────
type AssignTab = 'group' | 'user';

interface AssignModalProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
}

function AssignModal({ courseId, courseTitle, onClose }: AssignModalProps) {
  const [tab, setTab] = useState<AssignTab>('group');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [result, setResult] = useState<GroupEnrollmentResult | null>(null);
  const [error, setError] = useState('');

  // Назначение конкретному пользователю
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userDone, setUserDone] = useState(false);

  useEffect(() => {
    apiGet<Group[]>('/api/groups/')
      .then(setGroups)
      .catch(console.error)
      .finally(() => setLoadingGroups(false));
    apiGet<AppUser[]>('/api/users/')
      .then((all) => setUsers(all.filter((u) => u.role === 'student')))
      .catch(console.error);
  }, []);

  const handleAssignUser = async () => {
    if (!selectedUserId) return;
    setAssigning(true);
    setError('');
    try {
      await apiPost('/api/enrollments/', {
        user_id: Number(selectedUserId),
        course_id: courseId,
        due_date: dueDate || null,
      });
      setUserDone(true);
    } catch {
      setError('Не удалось назначить. Возможно, курс уже назначен этому сотруднику.');
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignGroup = async () => {
    if (!selectedGroupId) return;
    setAssigning(true);
    setError('');
    try {
      const res = await apiPost<GroupEnrollmentResult>('/api/enrollments/group', {
        group_id: selectedGroupId,
        course_id: courseId,
        due_date: dueDate || null,
      });
      setResult(res);
    } catch {
      setError('Не удалось назначить курс. Проверьте соединение.');
    } finally {
      setAssigning(false);
    }
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl mb-6">
        {(['group', 'user'] as AssignTab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setResult(null); setError(''); setUserDone(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === t
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'group' ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
            {t === 'group' ? 'На отдел' : 'Пользователю'}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500 font-medium mb-4">
        Курс: <span className="font-bold text-slate-800">«{courseTitle}»</span>
      </p>

      {tab === 'group' && (
        <>
          {result ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <p className="font-extrabold text-slate-800 text-lg mb-1">Готово!</p>
              <p className="text-slate-500 text-sm">
                Назначено: <span className="font-bold text-emerald-600">{result.enrolled}</span> сотрудников
                {result.skipped > 0 && (
                  <>, пропущено (уже назначены): <span className="font-bold">{result.skipped}</span></>
                )}
              </p>
              <button
                onClick={onClose}
                className="mt-5 px-6 py-2.5 rounded-2xl bg-brand text-white font-bold text-sm hover:opacity-90 transition-opacity"
              >
                Закрыть
              </button>
            </div>
          ) : (
            <>
              {loadingGroups ? (
                <p className="text-slate-400 text-sm text-center py-4">Загрузка отделов...</p>
              ) : groups.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">Нет доступных отделов</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto mb-5">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                        selectedGroupId === group.id
                          ? 'border-brand bg-brand/5 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-bold ${selectedGroupId === group.id ? 'text-brand' : 'text-slate-800'}`}>
                          {group.name}
                        </p>
                        {group.description && (
                          <p className="text-xs text-slate-400 mt-0.5">{group.description}</p>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-400 shrink-0 ml-3">
                        {group.user_count} чел.
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {error && (
                <p className="text-red-500 text-sm font-semibold mb-3">{error}</p>
              )}

              {/* Срок сдачи */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Срок сдачи (необязательно)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-medium text-slate-700 transition-all"
                />
              </div>

              {selectedGroup && (
                <div className="mb-4 px-4 py-3 rounded-2xl bg-brand/5 border border-brand/20">
                  <p className="text-xs font-bold text-brand uppercase tracking-wider mb-0.5">Будет назначено</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {selectedGroup.name} — {selectedGroup.user_count} сотрудников
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors text-sm"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAssignGroup}
                  disabled={!selectedGroupId || assigning}
                  className="flex-1 py-3 rounded-2xl bg-brand text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {assigning ? 'Назначаем...' : 'Назначить курс'}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'user' && (
        <>
          {userDone ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <p className="font-extrabold text-slate-800 text-lg mb-1">Готово!</p>
              <p className="text-slate-500 text-sm">
                Курс назначен сотруднику{' '}
                <span className="font-bold text-slate-800">
                  {users.find((u) => String(u.id) === selectedUserId)?.full_name}
                </span>
              </p>
              <button
                onClick={onClose}
                className="mt-5 px-6 py-2.5 rounded-2xl bg-brand text-white font-bold text-sm hover:opacity-90 transition-opacity"
              >
                Закрыть
              </button>
            </div>
          ) : (
            <>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Сотрудник
              </label>
              <Select
                value={selectedUserId}
                onChange={setSelectedUserId}
                options={users.map((u) => ({
                  value: String(u.id),
                  label: u.full_name,
                  description: u.group_name ? `${u.email} · ${u.group_name}` : u.email,
                }))}
                placeholder="— Выберите сотрудника —"
                emptyText="Сотрудники не найдены"
              />

              {/* Срок сдачи */}
              <div className="mt-4 mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Срок сдачи (необязательно)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-medium text-slate-700 transition-all"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm font-semibold mb-3">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors text-sm"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAssignUser}
                  disabled={!selectedUserId || assigning}
                  className="flex-1 py-3 rounded-2xl bg-brand text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {assigning ? 'Назначаем...' : 'Назначить курс'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function HRCourseList() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [assignCourse, setAssignCourse] = useState<CourseListItem | null>(null);

  const load = () => {
    setLoading(true);
    apiGet<CourseListItem[]>('/api/courses/')
      .then(setCourses)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const confirmDelete = (id: string, title: string) => {
    setDeleteId(id);
    setDeleteTitle(title);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/courses/${deleteId}`);
      setCourses((prev) => prev.filter((c) => c.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageLayout sidebar={<Sidebar />}>
      <Navbar
        title="Библиотека курсов"
        subtitle="HR-панель"
        rightContent={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/hr/courses/generate')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-brand/40 hover:text-brand text-slate-700 rounded-2xl font-bold transition-all text-sm"
            >
              <Sparkles className="w-4 h-4" /> Сгенерировать с AI
            </button>
            <button
              id="create-course-btn"
              onClick={() => navigate('/hr/courses/new')}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-2xl font-bold shadow-lg shadow-brand/30 hover:-translate-y-1 transition-all text-sm"
            >
              <Plus className="w-4 h-4" /> Создать курс
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Search */}
          <div className="relative mb-8 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по курсам..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-medium text-slate-700 transition-all"
            />
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : filtered.length === 0 ? (
            <EmptyState
              variant={search ? 'search' : 'courses'}
              title={search ? 'Ничего не найдено' : 'Курсов пока нет'}
              description={search ? 'По вашему запросу курсы не найдены. Попробуйте изменить поисковый запрос.' : 'Создайте первый курс для обучения сотрудников предприятия.'}
              action={!search ? { label: 'Создать курс', onClick: () => navigate('/hr/courses/new'), icon: Plus } : undefined}
            />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}
            >
              {filtered.map((course, i) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="h-full"
                >
                  <CourseCard
                    course={course}
                    onClick={() => navigate(`/hr/courses/${course.id}/edit`)}
                    onEdit={() => navigate(`/hr/courses/${course.id}/edit`)}
                    onDelete={() => confirmDelete(course.id, course.title)}
                    onAssign={() => setAssignCourse(course)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Удалить курс?"
      >
        <p className="text-slate-600 font-medium mb-6">
          Вы собираетесь удалить курс <span className="font-bold text-slate-800">«{deleteTitle}»</span>. Это действие нельзя отменить.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteId(null)}
            className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Отмена
          </button>
          <button
            id="confirm-delete-btn"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {deleting ? 'Удаляем...' : 'Удалить'}
          </button>
        </div>
      </Modal>

      {/* Assign to group/user modal */}
      <Modal
        isOpen={!!assignCourse}
        onClose={() => setAssignCourse(null)}
        title="Назначить курс"
        maxWidth="max-w-md"
      >
        {assignCourse && (
          <AssignModal
            courseId={assignCourse.id}
            courseTitle={assignCourse.title}
            onClose={() => setAssignCourse(null)}
          />
        )}
      </Modal>
    </PageLayout>
  );
}
