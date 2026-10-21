import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Plus, Trash2, FileText, Video,
  PenLine, ChevronDown, ChevronRight, Layers, Trophy,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import type { ModuleCreate, LessonCreate, ModuleTest } from '../../../types';

export type ActiveItem =
  | { kind: 'lesson'; id: string }
  | { kind: 'test';   id: string };

interface Props {
  modules: ModuleCreate[];
  activeItem: ActiveItem | null;
  width: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  rootModuleId?: string;
  onSelectLesson: (id: string) => void;
  onSelectTest: (id: string) => void;
  onAddModule: () => void;
  onAddLesson: (moduleId: string) => void;
  onAddTest: (moduleId: string) => void;
  onAddRootLesson?: () => void;
  onAddRootTest?: () => void;
  onUpdateModuleTitle: (id: string, title: string) => void;
  onDeleteModule: (id: string) => void;
  onDeleteLesson: (moduleId: string, lessonId: string) => void;
  onDeleteTest: (moduleId: string, testId: string) => void;
  onReorderModules: (newModules: ModuleCreate[]) => void;
  onReorderLessons: (moduleId: string, newLessons: LessonCreate[]) => void;
  onReorderTests: (moduleId: string, newTests: ModuleTest[]) => void;
}

// ── Drag-ghost pill shown in DragOverlay ──────────────────────────────────────
function DragGhost({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-2xl shadow-2xl border border-brand/20 text-slate-700 font-semibold text-sm opacity-95 cursor-grabbing min-w-[160px]">
      <span className="text-slate-300">{icon}</span>
      <span className="truncate max-w-[180px]">{label}</span>
    </div>
  );
}

// ── Sortable lesson row ───────────────────────────────────────────────────────
function SortableLesson({
  lesson, isActive,
  onSelect, onDelete,
}: {
  lesson: LessonCreate;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`group/lesson flex items-center gap-1.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all border ${
          isActive
            ? 'bg-brand/10 border-brand/20 shadow-sm'
            : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
        }`}
        onClick={onSelect}
      >
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-slate-300 opacity-0 group-hover/lesson:opacity-100 hover:text-slate-500 cursor-grab active:cursor-grabbing transition-opacity touch-none"
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        <div className={`flex items-center justify-center w-6 h-6 rounded-md shrink-0 ${
          isActive ? 'bg-white text-brand shadow-sm' : 'text-slate-400'
        }`}>
          {lesson.type === 'video' ? <Video className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
        </div>

        <span className={`text-sm flex-1 min-w-0 truncate ${
          isActive ? 'font-bold text-brand' : 'font-medium text-slate-600'
        }`}>
          {lesson.title || 'Новый урок'}
        </span>

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover/lesson:opacity-100 w-5 h-5 rounded-lg hover:bg-red-100 hover:text-red-500 text-slate-300 flex items-center justify-center transition-all shrink-0"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Sortable test row ─────────────────────────────────────────────────────────
function SortableTest({
  test, isActive, isFinal,
  onSelect, onDelete,
}: {
  test: ModuleTest;
  isActive: boolean;
  isFinal?: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `test-${test.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const activeClass = isActive
    ? 'bg-brand/10 border-brand/20 shadow-sm'
    : 'border-transparent hover:bg-slate-50 hover:border-slate-200';

  const iconClass = isActive ? 'bg-white text-brand shadow-sm' : 'text-slate-400';

  const titleClass = isActive ? 'font-bold text-brand' : 'font-medium text-slate-600';

  const badgeClass = isFinal
    ? 'text-slate-400 bg-slate-50 border-slate-200'
    : 'text-slate-400 bg-slate-50 border-slate-200';

  const badgeLabel = isFinal ? 'Итог' : 'Тест';

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`group/test flex items-center gap-1.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all border ${activeClass}`}
        onClick={onSelect}
      >
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-slate-200 opacity-0 group-hover/test:opacity-100 hover:text-slate-400 cursor-grab active:cursor-grabbing transition-opacity touch-none"
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        <div className={`flex items-center justify-center w-6 h-6 rounded-md shrink-0 ${iconClass}`}>
          {isFinal ? <Trophy className="w-3.5 h-3.5" /> : <PenLine className="w-3.5 h-3.5" />}
        </div>

        <span className={`text-sm flex-1 min-w-0 truncate ${titleClass}`}>
          {test.title || (isFinal ? 'Итоговый тест' : 'Тест модуля')}
        </span>

        <span className={`shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${badgeClass}`}>
          {badgeLabel}
        </span>

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover/test:opacity-100 w-5 h-5 rounded-lg hover:bg-red-100 hover:text-red-500 text-slate-300 flex items-center justify-center transition-all shrink-0"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Lessons + Tests DnD section (reusable) ────────────────────────────────────
function LessonsTestsSection({
  lessons, tests, activeItem, isFinalSection,
  onSelectLesson, onSelectTest,
  onDeleteLesson, onDeleteTest,
  onReorderLessons, onReorderTests,
}: {
  moduleId: string;
  lessons: LessonCreate[];
  tests: ModuleTest[];
  activeItem: ActiveItem | null;
  isFinalSection?: boolean;
  onSelectLesson: (id: string) => void;
  onSelectTest: (id: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onDeleteTest: (testId: string) => void;
  onReorderLessons: (newLessons: LessonCreate[]) => void;
  onReorderTests: (newTests: ModuleTest[]) => void;
}) {
  const [activeLessonDragId, setActiveLessonDragId] = useState<string | null>(null);
  const [activeTestDragId, setActiveTestDragId] = useState<string | null>(null);

  const lessonSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const testSensors  = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleLessonDragStart = (e: DragStartEvent) => setActiveLessonDragId(String(e.active.id));
  const handleLessonDragEnd = (e: DragEndEvent) => {
    setActiveLessonDragId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = lessons.findIndex((l) => l.id === active.id);
    const newIdx = lessons.findIndex((l) => l.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) onReorderLessons(arrayMove(lessons, oldIdx, newIdx));
  };

  const handleTestDragStart = (e: DragStartEvent) => setActiveTestDragId(String(e.active.id));
  const handleTestDragEnd = (e: DragEndEvent) => {
    setActiveTestDragId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id).replace('test-', '');
    const overId = String(over.id).replace('test-', '');
    const oldIdx = tests.findIndex((t) => t.id === activeId);
    const newIdx = tests.findIndex((t) => t.id === overId);
    if (oldIdx !== -1 && newIdx !== -1) onReorderTests(arrayMove(tests, oldIdx, newIdx));
  };

  const draggedLesson = activeLessonDragId ? lessons.find((l) => l.id === activeLessonDragId) : null;
  const draggedTest   = activeTestDragId ? tests.find((t) => `test-${t.id}` === activeTestDragId) : null;

  return (
    <>
      <DndContext
        sensors={lessonSensors}
        collisionDetection={closestCenter}
        onDragStart={handleLessonDragStart}
        onDragEnd={handleLessonDragEnd}
      >
        <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {lessons.map((lesson) => (
            <SortableLesson
              key={lesson.id}
              lesson={lesson}
              isActive={activeItem?.kind === 'lesson' && activeItem.id === lesson.id}
              onSelect={() => onSelectLesson(lesson.id)}
              onDelete={() => onDeleteLesson(lesson.id)}
            />
          ))}
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {draggedLesson && (
            <DragGhost
              label={draggedLesson.title || 'Новый урок'}
              icon={draggedLesson.type === 'video' ? <Video className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
            />
          )}
        </DragOverlay>
      </DndContext>

      {tests.length > 0 && (
        <>
          {lessons.length > 0 && (
            <div className="flex items-center gap-2 py-1 px-2.5">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-wider">тесты</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
          )}
          <DndContext
            sensors={testSensors}
            collisionDetection={closestCenter}
            onDragStart={handleTestDragStart}
            onDragEnd={handleTestDragEnd}
          >
            <SortableContext items={tests.map((t) => `test-${t.id}`)} strategy={verticalListSortingStrategy}>
              {tests.map((test) => (
                <SortableTest
                  key={test.id}
                  test={test}
                  isActive={activeItem?.kind === 'test' && activeItem.id === test.id}
                  isFinal={isFinalSection || test.type === 'final'}
                  onSelect={() => onSelectTest(test.id)}
                  onDelete={() => onDeleteTest(test.id)}
                />
              ))}
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {draggedTest && (
                <DragGhost
                  label={draggedTest.title || (isFinalSection ? 'Итоговый тест' : 'Тест модуля')}
                  icon={isFinalSection ? <Trophy className="w-3.5 h-3.5" /> : <PenLine className="w-3.5 h-3.5" />}
                />
              )}
            </DragOverlay>
          </DndContext>
        </>
      )}
    </>
  );
}

// ── Sortable module block ─────────────────────────────────────────────────────
function SortableModule({
  module, activeItem,
  onSelectLesson, onSelectTest,
  onAddLesson, onAddTest,
  onUpdateModuleTitle, onDeleteModule,
  onDeleteLesson, onDeleteTest,
  onReorderLessons, onReorderTests,
}: {
  module: ModuleCreate;
  activeItem: ActiveItem | null;
  onSelectLesson: (id: string) => void;
  onSelectTest: (id: string) => void;
  onAddLesson: () => void;
  onAddTest: () => void;
  onUpdateModuleTitle: (title: string) => void;
  onDeleteModule: () => void;
  onDeleteLesson: (lessonId: string) => void;
  onDeleteTest: (testId: string) => void;
  onReorderLessons: (newLessons: LessonCreate[]) => void;
  onReorderTests: (newTests: ModuleTest[]) => void;
}) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [collapsed, setCollapsed] = useState(false);

  const lessonCount = module.lessons.length;
  const testCount   = module.tests.length;

  return (
    <div ref={setNodeRef} style={style} className="group/module">
      {/* ── Module header ── */}
      <div className={`flex items-center gap-1 mb-1 px-1 py-1 rounded-xl transition-colors ${isDragging ? '' : 'group-hover/module:bg-slate-50/80'}`}>
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 w-5 h-5 flex items-center justify-center text-slate-300 opacity-0 group-hover/module:opacity-100 hover:text-slate-500 cursor-grab active:cursor-grabbing transition-opacity touch-none"
          tabIndex={-1}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <button
          onClick={() => setCollapsed((v) => !v)}
          className="shrink-0 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <input
          type="text"
          value={module.title}
          onChange={(e) => onUpdateModuleTitle(e.target.value)}
          className="flex-1 font-extrabold text-slate-700 bg-transparent text-[11px] uppercase tracking-wider border-none outline-none hover:bg-slate-100 focus:bg-white px-1.5 py-0.5 rounded-md transition-colors min-w-0"
        />

        {!collapsed && (lessonCount > 0 || testCount > 0) && (
          <div className="flex items-center gap-1 shrink-0">
            {lessonCount > 0 && (
              <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                {lessonCount}у
              </span>
            )}
            {testCount > 0 && (
              <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                {testCount}т
              </span>
            )}
          </div>
        )}

        <button
          onClick={onDeleteModule}
          className="opacity-0 group-hover/module:opacity-100 w-5 h-5 rounded-lg hover:bg-red-100 hover:text-red-500 text-slate-300 flex items-center justify-center transition-all shrink-0"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* ── Module content ── */}
      {!collapsed && (
        <div className="ml-5 space-y-0.5 mb-1">
          <LessonsTestsSection
            moduleId={module.id}
            lessons={module.lessons}
            tests={module.tests}
            activeItem={activeItem}
            onSelectLesson={onSelectLesson}
            onSelectTest={onSelectTest}
            onDeleteLesson={onDeleteLesson}
            onDeleteTest={onDeleteTest}
            onReorderLessons={onReorderLessons}
            onReorderTests={onReorderTests}
          />

          {module.lessons.length === 0 && module.tests.length === 0 && (
            <p className="text-slate-300 text-xs font-semibold italic px-2.5 py-2">Пусто — добавьте урок</p>
          )}

          <div className="flex gap-1 pt-1">
            <button
              onClick={onAddLesson}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[12px] font-bold text-brand hover:bg-brand/10 transition-colors"
            >
              <Plus className="w-3 h-3" /> Урок
            </button>
            <div className="w-px bg-slate-100" />
            <button
              onClick={onAddTest}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[12px] font-bold text-brand hover:bg-brand/10 transition-colors"
            >
              <PenLine className="w-3 h-3" /> Тест
            </button>
          </div>
        </div>
      )}

      <div className="h-px bg-slate-100 mx-2 my-2" />
    </div>
  );
}

// ── Root section (final lessons + tests, shown at bottom) ─────────────────────
function RootSection({
  rootModule, activeItem,
  onSelectLesson, onSelectTest,
  onDeleteLesson, onDeleteTest,
  onAddRootLesson, onAddRootTest,
  onReorderLessons, onReorderTests,
}: {
  rootModule: ModuleCreate;
  activeItem: ActiveItem | null;
  onSelectLesson: (id: string) => void;
  onSelectTest: (id: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onDeleteTest: (testId: string) => void;
  onAddRootLesson: () => void;
  onAddRootTest: () => void;
  onReorderLessons: (newLessons: LessonCreate[]) => void;
  onReorderTests: (newTests: ModuleTest[]) => void;
}) {
  const isEmpty = rootModule.lessons.length === 0 && rootModule.tests.length === 0;

  return (
    <div className="mt-3">
      {/* Section divider — subtle, structural, not colorful */}
      <div className="flex items-center gap-2 px-2 mb-2">
        <div className="flex-1 h-px bg-slate-100" />
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(37,99,235,0.05)' }}>
          <Trophy className="w-2.5 h-2.5" style={{ color: '#94a3b8' }} />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Итоговый раздел</span>
        </div>
        <div className="flex-1 h-px bg-slate-100" />
      </div>

      <div className="ml-2 space-y-0.5">
        {isEmpty && (
          <p className="text-slate-300 text-xs font-medium italic px-2.5 py-1.5">
            Добавьте итоговый тест или урок
          </p>
        )}

        <LessonsTestsSection
          moduleId={rootModule.id}
          lessons={rootModule.lessons}
          tests={rootModule.tests}
          activeItem={activeItem}
          isFinalSection
          onSelectLesson={onSelectLesson}
          onSelectTest={onSelectTest}
          onDeleteLesson={onDeleteLesson}
          onDeleteTest={onDeleteTest}
          onReorderLessons={onReorderLessons}
          onReorderTests={onReorderTests}
        />

        <div className="flex gap-1 pt-1">
          <button
            onClick={onAddRootLesson}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[12px] font-bold text-brand hover:bg-brand/10 transition-colors"
          >
            <Plus className="w-3 h-3" /> Урок
          </button>
          <div className="w-px bg-slate-100" />
          <button
            onClick={onAddRootTest}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[12px] font-bold text-brand hover:bg-brand/10 transition-colors"
          >
            <Trophy className="w-3 h-3" /> Итоговый тест
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Collapsed icon rail ───────────────────────────────────────────────────────
function CollapsedView({ modules, activeItem, rootModuleId, onSelectLesson, onSelectTest, onAddModule, onAddLesson, onToggleCollapse }: Pick<Props,
  'modules' | 'activeItem' | 'rootModuleId' | 'onSelectLesson' | 'onSelectTest' | 'onAddModule' | 'onAddLesson' | 'onToggleCollapse'
>) {
  const normalModules = modules.filter((m) => m.id !== rootModuleId);

  return (
    <div className="bento-card flex flex-col items-center py-4 px-0 bg-white/90 backdrop-blur-xl min-h-full w-full">
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          title="Развернуть программу"
          className="w-10 h-10 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-brand flex items-center justify-center transition-all mb-2 shrink-0"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
      )}
      <button
        onClick={onAddModule}
        title="Добавить модуль"
        className="w-10 h-10 rounded-xl bg-brand/10 hover:bg-brand text-brand hover:text-white flex items-center justify-center transition-all mb-4 shrink-0"
      >
        <Plus className="w-5 h-5" />
      </button>

      <div className="flex flex-col items-center gap-4 w-full px-2">
        {normalModules.map((module, idx) => (
          <div key={module.id} className="flex flex-col items-center gap-1.5 w-full">
            <div className="w-8 h-6 rounded-lg bg-slate-100 flex items-center justify-center" title={module.title}>
              <span className="text-[11px] font-black text-slate-400">{idx + 1}</span>
            </div>
            {module.lessons.map((lesson) => {
              const isActive = activeItem?.kind === 'lesson' && activeItem.id === lesson.id;
              return (
                <button
                  key={lesson.id}
                  onClick={() => onSelectLesson(lesson.id)}
                  title={lesson.title || 'Урок'}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    isActive ? 'bg-brand text-white shadow-lg shadow-brand/25 scale-105' : 'bg-slate-50 text-slate-400 hover:bg-brand/10 hover:text-brand'
                  }`}
                >
                  {lesson.type === 'video' ? <Video className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </button>
              );
            })}
            {module.tests.map((test) => {
              const isActive = activeItem?.kind === 'test' && activeItem.id === test.id;
              return (
                <button
                  key={test.id}
                  onClick={() => onSelectTest(test.id)}
                  title={test.title || 'Тест'}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    isActive ? 'bg-brand text-white shadow-lg shadow-brand/25 scale-105' : 'bg-slate-50 text-slate-400 hover:bg-brand/10 hover:text-brand'
                  }`}
                >
                  <PenLine className="w-5 h-5" />
                </button>
              );
            })}
            <button
              onClick={() => onAddLesson(module.id)}
              title="Добавить урок"
              className="w-11 h-7 rounded-xl border-2 border-dashed border-slate-200 text-slate-300 hover:border-brand/50 hover:text-brand flex items-center justify-center transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            {idx < normalModules.length - 1 && <div className="w-8 h-px bg-slate-200 rounded-full" />}
          </div>
        ))}
        {normalModules.length === 0 && (
          <div className="py-8 opacity-30"><Layers className="w-6 h-6 text-slate-400" /></div>
        )}
      </div>
    </div>
  );
}

// ── Expanded view with DnD for modules ───────────────────────────────────────
function ExpandedView(props: Omit<Props, 'width'>) {
  const {
    modules, activeItem, rootModuleId, onToggleCollapse,
    onSelectLesson, onSelectTest,
    onAddModule, onAddLesson, onAddTest,
    onAddRootLesson, onAddRootTest,
    onUpdateModuleTitle, onDeleteModule,
    onDeleteLesson, onDeleteTest,
    onReorderModules, onReorderLessons, onReorderTests,
  } = props;

  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  const normalModules = modules.filter((m) => m.id !== rootModuleId);
  const rootModule    = rootModuleId ? modules.find((m) => m.id === rootModuleId) : undefined;

  const moduleSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleModuleDragStart = (e: DragStartEvent) => setActiveModuleId(String(e.active.id));

  const handleModuleDragEnd = (e: DragEndEvent) => {
    setActiveModuleId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = normalModules.findIndex((m) => m.id === active.id);
    const newIdx = normalModules.findIndex((m) => m.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) {
      // Reorder only normal modules, keep root module in place
      const reordered = arrayMove(normalModules, oldIdx, newIdx);
      onReorderModules(rootModule ? [...reordered, rootModule] : reordered);
    }
  };

  const draggedModule = activeModuleId ? normalModules.find((m) => m.id === activeModuleId) : null;

  return (
    <div className="bento-card flex flex-col bg-white/90 backdrop-blur-xl min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title="Свернуть программу"
              className="w-7 h-7 -ml-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand flex items-center justify-center transition-all shrink-0"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
          <h2 className="font-bold text-slate-800 text-[13px] uppercase tracking-widest">Программа</h2>
        </div>
        <button
          onClick={onAddModule}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand/10 hover:bg-brand text-brand hover:text-white text-xs font-bold transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Модуль
        </button>
      </div>

      {/* Modules list */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-4">
        {normalModules.length === 0 && !rootModule ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <Layers className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-slate-400 text-sm font-semibold">Нажмите «＋ Модуль» чтобы начать</p>
          </div>
        ) : (
          <>
            {normalModules.length > 0 && (
              <DndContext
                sensors={moduleSensors}
                collisionDetection={closestCenter}
                onDragStart={handleModuleDragStart}
                onDragEnd={handleModuleDragEnd}
              >
                <SortableContext
                  items={normalModules.map((m) => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {normalModules.map((module) => (
                    <SortableModule
                      key={module.id}
                      module={module}
                      activeItem={activeItem}
                      onSelectLesson={onSelectLesson}
                      onSelectTest={onSelectTest}
                      onAddLesson={() => onAddLesson(module.id)}
                      onAddTest={() => onAddTest(module.id)}
                      onUpdateModuleTitle={(title) => onUpdateModuleTitle(module.id, title)}
                      onDeleteModule={() => onDeleteModule(module.id)}
                      onDeleteLesson={(lessonId) => onDeleteLesson(module.id, lessonId)}
                      onDeleteTest={(testId) => onDeleteTest(module.id, testId)}
                      onReorderLessons={(newLessons) => onReorderLessons(module.id, newLessons)}
                      onReorderTests={(newTests) => onReorderTests(module.id, newTests)}
                    />
                  ))}
                </SortableContext>

                <DragOverlay dropAnimation={null}>
                  {draggedModule && (
                    <div className="bg-white rounded-2xl shadow-2xl border border-brand/20 px-4 py-3 opacity-95 cursor-grabbing min-w-[200px]">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Модуль</p>
                      <p className="text-sm font-bold text-slate-700 truncate">{draggedModule.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {draggedModule.lessons.length} уроков · {draggedModule.tests.length} тестов
                      </p>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            )}

            {rootModule && onAddRootLesson && onAddRootTest && (
              <RootSection
                rootModule={rootModule}
                activeItem={activeItem}
                onSelectLesson={onSelectLesson}
                onSelectTest={onSelectTest}
                onDeleteLesson={(lessonId) => onDeleteLesson(rootModule.id, lessonId)}
                onDeleteTest={(testId) => onDeleteTest(rootModule.id, testId)}
                onAddRootLesson={onAddRootLesson}
                onAddRootTest={onAddRootTest}
                onReorderLessons={(newLessons) => onReorderLessons(rootModule.id, newLessons)}
                onReorderTests={(newTests) => onReorderTests(rootModule.id, newTests)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Entry point ───────────────────────────────────────────────────────────────
export function SyllabusPanel({ width, ...props }: Props) {
  if (width < 240) {
    return (
      <CollapsedView
        modules={props.modules}
        activeItem={props.activeItem}
        rootModuleId={props.rootModuleId}
        onSelectLesson={props.onSelectLesson}
        onSelectTest={props.onSelectTest}
        onAddModule={props.onAddModule}
        onAddLesson={props.onAddLesson}
        onToggleCollapse={props.onToggleCollapse}
      />
    );
  }
  return <ExpandedView {...props} />;
}
