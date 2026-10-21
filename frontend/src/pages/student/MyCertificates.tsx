import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, ArrowRight, Calendar, Star, ShieldCheck } from 'lucide-react';
import { apiGet } from '../../lib/api';
import type { CertificateRead, CourseListItem } from '../../types';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { Navbar } from '../../components/layout/Navbar';
import { BentoCard } from '../../components/ui/BentoCard';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';

interface CertWithCourse {
  cert: CertificateRead;
  course: CourseListItem | null;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

// Печать-медаль: тёмно-синий диск в цвет интерфейса с тонким золотым
// кольцом — сдержанный акцент, без жёлтой заливки.
function Medal({ size = 48 }: { size?: number }) {
  return (
    <div
      className="rounded-2xl flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)',
        boxShadow: '0 6px 16px rgba(30,58,138,0.30), inset 0 0 0 1.5px rgba(201,162,39,0.55)',
      }}
    >
      <Award className="text-white" style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
}

export function MyCertificates() {
  const [items, setItems] = useState<CertWithCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<CertificateRead[]>('/api/certificates/me')
      .then(async (certs) => {
        const enriched = await Promise.all(
          certs.map(async (cert) => {
            try {
              const course = await apiGet<CourseListItem>(`/api/courses/${cert.course_id}`);
              return { cert, course };
            } catch {
              return { cert, course: null };
            }
          })
        );
        enriched.sort((a, b) => {
          const ta = a.cert.issued_at ? new Date(a.cert.issued_at).getTime() : 0;
          const tb = b.cert.issued_at ? new Date(b.cert.issued_at).getTime() : 0;
          return tb - ta;
        });
        setItems(enriched);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner fullPage />;

  const scored = items.filter((i) => i.cert.score !== null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, i) => s + (i.cert.score ?? 0), 0) / scored.length)
    : null;
  const latest = items[0]?.cert.issued_at ?? null;

  return (
    <PageLayout sidebar={<Sidebar />}>
      <Navbar title="Мои сертификаты" subtitle="Достижения" />
      <div className="flex-1 overflow-y-auto px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {items.length === 0 ? (
            <div className="bento-card mt-4">
              <EmptyState
                variant="certificates"
                title="Пока нет сертификатов"
                description="Завершите курс на 100% и получите именной сертификат с возможностью верификации."
              />
            </div>
          ) : (
            <>
              {/* ── Сводка ─────────────────────────────────────────────── */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-2 mb-8">
                <BentoCard noHover className="p-6 flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="flex items-center gap-4 flex-1">
                    <Medal size={56} />
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">
                        Мои достижения
                      </div>
                      <h2 className="text-3xl font-black text-slate-900 leading-none">
                        {items.length} {plural(items.length, 'сертификат', 'сертификата', 'сертификатов')}
                      </h2>
                    </div>
                  </div>

                  <div className="flex gap-3 shrink-0">
                    {avgScore !== null && (
                      <div className="px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-center min-w-[104px]">
                        <div className="text-xl font-black text-slate-800 flex items-center justify-center gap-1">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                          {avgScore}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-0.5">
                          Средний балл
                        </div>
                      </div>
                    )}
                    <div className="px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                      <div className="text-sm font-black text-slate-800 mt-1">{formatDate(latest)}</div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-0.5">
                        Последний
                      </div>
                    </div>
                  </div>
                </BentoCard>
              </motion.div>

              {/* ── Сетка ──────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {items.map(({ cert, course }, i) => (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.3) }}
                  >
                    <Link to={`/certificates/${cert.certificate_number}`} className="block group h-full">
                      <article className="bento-card h-full flex flex-col p-6">
                        {/* header */}
                        <div className="flex items-start justify-between gap-3">
                          <Medal size={44} />
                          {cert.score !== null && (
                            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-black text-brand bg-brand/[0.07] border border-brand/15">
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              {cert.score}
                            </div>
                          )}
                        </div>

                        {/* title */}
                        <div className="text-[9px] tracking-[0.28em] uppercase text-slate-400 font-bold mt-5">
                          Сертификат
                        </div>
                        <h3 className="font-extrabold text-lg text-slate-800 leading-snug mt-1 line-clamp-2 min-h-[3.25rem]">
                          {course?.title || 'Курс удалён'}
                        </h3>

                        {/* meta */}
                        <div className="mt-auto pt-5 flex items-center gap-2 text-xs text-slate-400 font-semibold">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(cert.issued_at)}
                          <span className="text-slate-300">·</span>
                          <span className="font-mono tracking-tight">№ {cert.certificate_number}</span>
                        </div>

                        {/* footer */}
                        <div className="mt-5 -mx-6 -mb-6 px-6 py-3.5 flex items-center justify-between border-t border-slate-100">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                            <ShieldCheck className="w-3.5 h-3.5" /> Подлинный
                          </span>
                          <span className="flex items-center gap-2 text-brand font-bold text-sm group-hover:gap-3 transition-all">
                            Открыть
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </article>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
