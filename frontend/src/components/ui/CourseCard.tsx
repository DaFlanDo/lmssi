import { useState, useRef } from 'react';
import { BookOpen, Layers, MoreHorizontal, Edit2, Trash2, Copy, UserPlus } from 'lucide-react';
import type { CourseListItem } from '../../types';
import { API_BASE_URL } from '../../lib/api';

interface Props {
  course: CourseListItem;
  progress?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onAssign?: () => void;
  onClick?: () => void;
}

// Deterministic gradient by first char of title
function getCoverGradient(title: string): string {
  const char = (title?.[0] || 'A').toUpperCase();
  const code = char.charCodeAt(0);
  const gradients = [
    'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #60a5fa 100%)', // blue
    'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #7c3aed 100%)', // blue-violet
    'linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #22d3ee 100%)', // teal
    'linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%)',               // ocean
    'linear-gradient(135deg, #312e81 0%, #4f46e5 60%, #818cf8 100%)',  // indigo
    'linear-gradient(135deg, #0c4a6e 0%, #0284c7 60%, #38bdf8 100%)', // sky
    'linear-gradient(135deg, #134e4a 0%, #059669 60%, #34d399 100%)', // emerald
    'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 60%, #93c5fd 100%)', // navy
  ];
  return gradients[code % gradients.length];
}

function getFirstLetter(title: string) {
  return (title?.[0] || '?').toUpperCase();
}

export function CourseCard({ course, progress, onEdit, onDelete, onDuplicate, onAssign, onClick }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const gradient = getCoverGradient(course.title);

  const coverUrl = course.cover_image
    ? `${API_BASE_URL}${course.cover_image}`
    : null;

  return (
    <div
      className="group relative rounded-[20px] bg-white cursor-pointer flex flex-col transition-all duration-200 h-full"
      style={{
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(37,99,235,0.06)',
        border: '1px solid rgba(226,232,240,0.8)',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(37,99,235,0.14), 0 2px 8px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(37,99,235,0.06)';
      }}
    >
      {/* Cover — 16:9 aspect ratio */}
      <div
        className="relative overflow-hidden rounded-t-[20px]"
        style={{ aspectRatio: '16/9', background: gradient, flexShrink: 0 }}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={course.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center transition-transform duration-300 group-hover:scale-[1.03]">
            {/* Decorative rings */}
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)' }} />
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.35)' }}
            >
              <span className="text-2xl font-black text-white drop-shadow-sm">{getFirstLetter(course.title)}</span>
            </div>
          </div>
        )}

      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        {/* Status badge */}
        <span
          className="self-start text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={course.is_published
            ? { background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }
            : { background: 'rgba(100,116,139,0.08)', color: '#64748b', border: '1px solid rgba(100,116,139,0.15)' }
          }
        >
          {course.is_published ? 'Опубликован' : 'Черновик'}
        </span>

        {/* Title */}
        <h3
          className="font-extrabold text-slate-800 leading-snug group-hover:text-brand transition-colors"
          style={{ fontSize: '15px', lineHeight: '1.35' }}
        >
          {course.title}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-400 mt-auto pt-1">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3 h-3" /> {course.module_count} модулей
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3 h-3" /> {course.lesson_count} уроков
          </span>
        </div>

        {/* Progress bar */}
        {progress !== undefined && (
          <div className="mt-2">
            <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
              <span>Прогресс</span>
              <span className="text-brand">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(to right, #2563eb, #60a5fa)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Three-dot menu — card-level so the dropdown isn't clipped by overflow */}
      {(onEdit || onDelete || onDuplicate || onAssign) && (
        <div
          ref={menuRef}
          className="absolute top-2.5 right-2.5 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
          >
            <MoreHorizontal className="w-4 h-4 text-slate-700" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-10 w-40 rounded-2xl py-1.5 z-50"
              style={{ background: 'white', boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)', border: '1px solid rgba(226,232,240,0.8)' }}
            >
              {onEdit && (
                <button
                  onClick={() => { setMenuOpen(false); onEdit(); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Редактировать
                </button>
              )}
              {onDuplicate && (
                <button
                  onClick={() => { setMenuOpen(false); onDuplicate(); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" /> Дублировать
                </button>
              )}
              {onAssign && (
                <button
                  onClick={() => { setMenuOpen(false); onAssign(); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-semibold text-brand hover:bg-brand/5 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Назначить
                </button>
              )}
              {onDelete && (
                <>
                  <div className="mx-3 my-1" style={{ height: 1, background: '#f1f5f9' }} />
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Удалить
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
