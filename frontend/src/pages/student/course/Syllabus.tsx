import {
  BookOpen, CheckCircle2, ClipboardList, FileText, Lock, PanelRightClose, PanelRightOpen, Trophy, Video,
} from 'lucide-react';
import type { ModuleRead } from '../../../types';
import type { ActiveItem } from './types';
import { TEST_TYPE_LABELS } from './types';

// ── Программа курса: модули → уроки и тесты, итоговый раздел ─────────────────
// Свёрнутый вид — колонка иконок, развёрнутый — полный список с блокировками.
export function Syllabus({
  expanded, onToggleExpanded, normalModules, rootModule,
  activeItem, completedIds, passedTestIds, isItemLocked, onSelect,
}: {
  expanded: boolean;
  onToggleExpanded: () => void;
  normalModules: ModuleRead[];
  rootModule: ModuleRead | undefined;
  activeItem: ActiveItem | null;
  completedIds: Set<string>;
  passedTestIds: Set<string>;
  isItemLocked: (item: ActiveItem) => boolean;
  onSelect: (item: ActiveItem) => void;
}) {
  return (
    <div className={`bento-card flex flex-col h-full max-h-[85vh] sticky top-0 overflow-y-auto bg-white/90 backdrop-blur-xl shrink-0 transition-all duration-300 ease-out ${expanded ? 'w-[340px] p-8' : 'w-[78px] p-3'}`}>
      <div className={`flex items-center mb-6 ${expanded ? 'justify-between' : 'justify-center'}`}>
        {expanded && (
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <BookOpen className="text-brand w-5 h-5" /> Программа
          </h3>
        )}
        <button
          onClick={() => onToggleExpanded()}
          className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-brand flex items-center justify-center transition-colors"
        >
          {expanded ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsed view */}
      {!expanded ? (
        <div className="space-y-1.5">
          {normalModules.flatMap((m) => m.lessons).map((lesson, idx) => {
            const isActive = activeItem?.kind === 'lesson' && activeItem.id === lesson.id;
            const isDone = completedIds.has(lesson.id);
            return (
              <button
                key={lesson.id}
                onClick={() => onSelect({ kind: 'lesson', id: lesson.id })}
                title={`${idx + 1}. ${lesson.title}`}
                className={`w-full h-12 rounded-2xl flex items-center justify-center transition-all border-2 ${
                  isActive ? 'bg-brand/10 border-brand/30 text-brand shadow-sm'
                  : isDone ? 'bg-brand/5 border-brand/30 text-brand'
                  : 'bg-white border-slate-200 text-slate-400 hover:border-brand/30 hover:text-brand'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-extrabold">{idx + 1}</span>}
              </button>
            );
          })}
          {/* Module tests (emerald) */}
          {normalModules.flatMap((m) => m.tests ?? []).map((test) => {
            const isActive = activeItem?.kind === 'test' && activeItem.id === test.id;
            return (
              <button
                key={test.id}
                onClick={() => onSelect({ kind: 'test', id: test.id })}
                title={test.title || 'Тест'}
                className={`w-full h-12 rounded-2xl flex items-center justify-center transition-all border-2 ${
                  isActive ? 'bg-emerald-100 border-emerald-400 text-emerald-700 shadow-sm'
                  : 'bg-emerald-50 border-emerald-100 text-emerald-400 hover:border-emerald-300 hover:text-emerald-600'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
              </button>
            );
          })}
          {/* Root lessons */}
          {(rootModule?.lessons ?? []).map((lesson) => {
            const isActive = activeItem?.kind === 'lesson' && activeItem.id === lesson.id;
            const isDone = completedIds.has(lesson.id);
            return (
              <button
                key={lesson.id}
                onClick={() => onSelect({ kind: 'lesson', id: lesson.id })}
                title={lesson.title}
                className={`w-full h-12 rounded-2xl flex items-center justify-center transition-all border-2 ${
                  isActive ? 'bg-amber-100 border-amber-400 text-amber-700 shadow-sm'
                  : isDone ? 'bg-amber-50 border-amber-200 text-amber-500'
                  : 'bg-white border-amber-200 text-amber-300 hover:border-amber-400 hover:text-amber-500'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-extrabold">★</span>}
              </button>
            );
          })}
          {/* Root (final) tests — amber */}
          {(rootModule?.tests ?? []).map((test) => {
            const isActive = activeItem?.kind === 'test' && activeItem.id === test.id;
            return (
              <button
                key={test.id}
                onClick={() => onSelect({ kind: 'test', id: test.id })}
                title={test.title || 'Итоговый тест'}
                className={`w-full h-12 rounded-2xl flex items-center justify-center transition-all border-2 ${
                  isActive ? 'bg-amber-100 border-amber-400 text-amber-700 shadow-sm'
                  : 'bg-amber-50 border-amber-100 text-amber-400 hover:border-amber-300 hover:text-amber-600'
                }`}
              >
                <Trophy className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      ) : (
        /* Expanded view */
        <div className="space-y-8">
          {/* Normal modules */}
          {normalModules.map((module) => (
            <div key={module.id}>
              <h4 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-4 pl-2">
                {module.title}
              </h4>
              <div className="space-y-2">
                {module.lessons.map((lesson) => {
                  const isActive = activeItem?.kind === 'lesson' && activeItem.id === lesson.id;
                  const isDone = completedIds.has(lesson.id);
                  const locked = isItemLocked({ kind: 'lesson', id: lesson.id });
                  return (
                    <div
                      key={lesson.id}
                      onClick={() => onSelect({ kind: 'lesson', id: lesson.id })}
                      title={locked ? 'Сначала пройдите предыдущие шаги' : undefined}
                      className={`flex items-start gap-3 p-3 rounded-2xl transition-all border border-transparent ${
                        locked ? 'opacity-50 cursor-not-allowed'
                        : isActive ? 'bg-brand/10 border-brand/20 shadow-sm cursor-pointer'
                        : 'hover:bg-slate-50 hover:border-slate-200 cursor-pointer'
                      }`}
                    >
                      <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2 bg-white ${
                        isDone ? 'border-brand text-brand bg-brand/5 shadow-sm'
                        : isActive ? 'border-brand/40 text-brand shadow-sm'
                        : 'border-slate-200 text-slate-300'
                      }`}>
                        {locked ? (
                          <Lock className="w-4 h-4 text-slate-300" />
                        ) : isDone ? (
                          <CheckCircle2 className="w-4 h-4 fill-brand text-white" />
                        ) : lesson.type === 'video' ? (
                          <Video className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className={`text-sm leading-snug line-clamp-2 ${isActive ? 'font-bold text-brand' : 'font-semibold text-slate-700'}`}>
                          {lesson.title}
                        </h5>
                        <span className="text-[10px] font-bold text-slate-400 mt-1 block">{lesson.duration}</span>
                      </div>
                    </div>
                  );
                })}
                {(module.tests ?? []).map((test) => {
                  const isActive = activeItem?.kind === 'test' && activeItem.id === test.id;
                  const typeLabel = TEST_TYPE_LABELS[test.type] ?? 'Тест';
                  const locked = isItemLocked({ kind: 'test', id: test.id });
                  const testDone = passedTestIds.has(test.id);
                  return (
                    <div
                      key={test.id}
                      onClick={() => onSelect({ kind: 'test', id: test.id })}
                      title={locked ? 'Сначала пройдите предыдущие шаги' : undefined}
                      className={`flex items-start gap-3 p-3 rounded-2xl transition-all border ${
                        locked ? 'opacity-50 cursor-not-allowed border-transparent'
                        : isActive ? 'bg-emerald-50 border-emerald-200 shadow-sm cursor-pointer'
                        : 'border-transparent hover:bg-emerald-50/50 hover:border-emerald-100 cursor-pointer'
                      }`}
                    >
                      <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2 bg-white ${
                        testDone ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                        : isActive ? 'border-emerald-400 text-emerald-600' : 'border-emerald-200 text-emerald-400'
                      }`}>
                        {locked ? <Lock className="w-4 h-4 text-slate-300" />
                          : testDone ? <CheckCircle2 className="w-4 h-4" />
                          : <ClipboardList className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className={`text-sm leading-snug line-clamp-2 ${isActive ? 'font-bold text-emerald-700' : 'font-semibold text-slate-600'}`}>
                          {test.title || typeLabel}
                        </h5>
                        <span className={`text-[10px] font-bold mt-1 block ${isActive ? 'text-emerald-500' : 'text-emerald-400'}`}>
                          {typeLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* ── Final section (root module) ── */}
          {rootModule && (rootModule.lessons.length > 0 || rootModule.tests.length > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-4 pl-2">
                <div className="flex-1 h-px bg-amber-200/70" />
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Итоговый раздел</span>
                </div>
                <div className="flex-1 h-px bg-amber-200/70" />
              </div>
              <div className="space-y-2">
                {rootModule.lessons.map((lesson) => {
                  const isActive = activeItem?.kind === 'lesson' && activeItem.id === lesson.id;
                  const isDone = completedIds.has(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      onClick={() => onSelect({ kind: 'lesson', id: lesson.id })}
                      className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all border border-transparent ${
                        isActive ? 'bg-amber-50 border-amber-200 shadow-sm' : 'hover:bg-amber-50/50 hover:border-amber-100'
                      }`}
                    >
                      <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2 bg-white ${
                        isDone ? 'border-amber-400 text-amber-500 bg-amber-50 shadow-sm'
                        : isActive ? 'border-amber-300 text-amber-500 shadow-sm'
                        : 'border-amber-200 text-amber-300'
                      }`}>
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : lesson.type === 'video' ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className={`text-sm leading-snug line-clamp-2 ${isActive ? 'font-bold text-amber-700' : 'font-semibold text-slate-700'}`}>
                          {lesson.title}
                        </h5>
                        <span className="text-[10px] font-bold text-amber-400 mt-1 block">{lesson.duration}</span>
                      </div>
                    </div>
                  );
                })}
                {rootModule.tests.map((test) => {
                  const isActive = activeItem?.kind === 'test' && activeItem.id === test.id;
                  return (
                    <div
                      key={test.id}
                      onClick={() => onSelect({ kind: 'test', id: test.id })}
                      className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${
                        isActive ? 'bg-amber-50 border-amber-300 shadow-sm' : 'border-transparent hover:bg-amber-50/60 hover:border-amber-100'
                      }`}
                    >
                      <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2 bg-white ${
                        isActive ? 'border-amber-400 text-amber-600' : 'border-amber-200 text-amber-400'
                      }`}>
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className={`text-sm leading-snug line-clamp-2 ${isActive ? 'font-bold text-amber-700' : 'font-semibold text-slate-600'}`}>
                          {test.title || 'Итоговый тест'}
                        </h5>
                        <span className={`text-[10px] font-bold mt-1 block ${isActive ? 'text-amber-500' : 'text-amber-400'}`}>
                          Итоговый тест
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
