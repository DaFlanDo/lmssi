import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Lock } from 'lucide-react';
import { apiGet } from '../../lib/api';
import type { CourseListItem, EnrollmentRead, CourseProgressRead } from '../../types';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { Navbar } from '../../components/layout/Navbar';
import { CourseCard } from '../../components/ui/CourseCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

interface CatalogCourse {
  course: CourseListItem;
  enrolled: boolean;
  progress?: number;
}

export function CourseCatalog() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CatalogCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [courses, enrollments] = await Promise.all([
          apiGet<CourseListItem[]>('/api/courses/'),
          apiGet<EnrollmentRead[]>('/api/enrollments/my'),
        ]);

        const enrolledIds = new Set(enrollments.map((e) => e.course_id));
        const published = courses.filter((c) => c.is_published);

        const result = await Promise.all(
          published.map(async (c) => {
            if (enrolledIds.has(c.id)) {
              try {
                const p = await apiGet<CourseProgressRead>(`/api/progress/courses/${c.id}`);
                return { course: c, enrolled: true, progress: p.progress_percent };
              } catch {
                return { course: c, enrolled: true, progress: 0 };
              }
            }
            return { course: c, enrolled: false };
          })
        );
        setItems(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = items.filter((i) =>
    i.course.title.toLowerCase().includes(search.toLowerCase())
  );

  const enrolledItems = filtered.filter((i) => i.enrolled);
  const catalogItems = filtered.filter((i) => !i.enrolled);

  return (
    <PageLayout sidebar={<Sidebar />}>
      <Navbar title="Каталог курсов" subtitle="LMSSI" />

      <div className="flex-1 overflow-y-auto px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Search */}
          <div className="relative mb-8 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск курсов..."
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
              description={search ? 'По вашему запросу курсы не найдены. Попробуйте изменить поиск.' : 'Опубликованные курсы, назначенные вам, появятся здесь.'}
            />
          ) : (
            <>
              {/* Enrolled courses */}
              {enrolledItems.length > 0 && (
                <div className="mb-10">
                  <h3 className="font-extrabold text-slate-700 text-lg mb-4">Мои курсы</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {enrolledItems.map((item, i) => (
                      <motion.div
                        key={item.course.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="h-full"
                      >
                        <CourseCard
                          course={item.course}
                          progress={item.progress}
                          onClick={() => navigate(`/courses/${item.course.id}`)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Catalog (not enrolled) */}
              {catalogItems.length > 0 && (
                <div>
                  <h3 className="font-extrabold text-slate-700 text-lg mb-2">Доступные курсы</h3>
                  <p className="text-sm text-slate-400 font-medium mb-6 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Запись на курсы выполняется HR-менеджером
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {catalogItems.map((item, i) => (
                      <motion.div
                        key={item.course.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="opacity-70 hover:opacity-100 transition-opacity h-full"
                      >
                        <CourseCard course={item.course} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
