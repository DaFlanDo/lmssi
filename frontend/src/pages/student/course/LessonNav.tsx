import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';

// ── Низ урока: «Назад» и «Завершить урок» с причинами, почему нельзя ─────────
export function LessonNav({
  prevLabel, onPrev, isCompleted, completing, completeError, videoBlocked, videoPercent, onComplete,
}: {
  prevLabel: string | undefined;
  onPrev: (() => void) | null;
  isCompleted: boolean;
  completing: boolean;
  completeError: string | null;
  /** Включён обязательный просмотр, а видео урока досмотрено меньше чем на 90% */
  videoBlocked: boolean;
  videoPercent: number;
  onComplete: () => void;
}) {
  return (
    <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
      <button
        onClick={() => onPrev?.()}
        disabled={!onPrev}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-700 font-bold transition-colors disabled:opacity-30"
      >
        <ChevronLeft className="w-5 h-5" />
        {prevLabel || 'Назад'}
      </button>

      {isCompleted ? (
        <span className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-2xl">
          <CheckCircle2 className="w-4 h-4" /> Завершено
        </span>
      ) : (
        <div className="flex flex-col items-end gap-2">
          {videoBlocked && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl">
              <PlayCircle className="w-3.5 h-3.5" />
              Досмотрите видео ({videoPercent}%), чтобы завершить
            </span>
          )}
          {completeError && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl max-w-xs text-right">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {completeError}
            </span>
          )}
          <button
            id="complete-lesson-btn"
            onClick={onComplete}
            disabled={completing || videoBlocked}
            title={videoBlocked ? 'Сначала досмотрите видео урока' : undefined}
            className="flex items-center gap-3 bg-brand hover:bg-brand-dark text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-brand/30 hover:-translate-y-1 transition-all disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
          >
            {completing ? 'Сохраняем...' : videoBlocked ? 'Видео не досмотрено' : 'Завершить урок'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
