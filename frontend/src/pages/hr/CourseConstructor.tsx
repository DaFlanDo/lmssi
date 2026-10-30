import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Save, ImagePlus, X, Eye, AlertTriangle, CheckCircle2, PanelLeftClose, PanelLeftOpen, HelpCircle, AlignLeft, Lock, PlayCircle } from 'lucide-react';
import { apiGet, apiPost, apiPut, getToken, API_BASE_URL } from '../../lib/api';
import type { CourseRead, ModuleCreate, LessonCreate, BlockCreate, ModuleTest } from '../../types';
import { PageLayout } from '../../components/layout/PageLayout';
import { Sidebar } from '../../components/Sidebar';
import { Modal } from '../../components/ui/Modal';
import { SyllabusPanel, type ActiveItem } from './constructor/SyllabusPanel';
import { EditorPanel } from './constructor/EditorPanel';
import { ModuleTestEditor } from './constructor/ModuleTestEditor';
import { LessonPreview } from './constructor/LessonPreview';
import { CourseOnboarding } from './constructor/CourseOnboarding';
import { ConstructorHelpModal } from './constructor/ConstructorHelpModal';

const genId = () => Math.random().toString(36).substring(2, 11);

type SaveStatus = 'idle' | 'saving' | 'error';

// ── Pre-publish validation helpers ────────────────────────────────────────────
interface ValidQ {
  type?: string; question?: string; options?: string[];
  correctIndices?: number[]; correctText?: string;
}
function collectTestIssues(test: ModuleTest, label: string): string[] {
  const out: string[] = [];
  let data: { questions?: ValidQ[] } = {};
  try { data = JSON.parse(test.content || '{}'); } catch { /* malformed */ }
  const questions = data.questions ?? [];
  const name = test.title?.trim() || 'без названия';
  if (questions.length === 0) {
    out.push(`${label} «${name}» — нет вопросов.`);
  }
  questions.forEach((q, i) => {
    const type = q.type ?? 'single';
    if (!q.question?.trim()) out.push(`${label} «${name}»: вопрос ${i + 1} без текста.`);
    if (type === 'short') {
      const accepted = (q.correctText ?? '').split('|').filter((x) => x.trim());
      if (accepted.length === 0) out.push(`${label} «${name}»: вопрос ${i + 1} — не задан правильный ответ.`);
    } else if (type === 'boolean') {
      /* у «верно/неверно» варианты фиксированы — проверять нечего */
    } else {
      if ((q.options ?? []).filter((o) => o.trim()).length < 2) out.push(`${label} «${name}»: вопрос ${i + 1} — меньше 2 вариантов.`);
      if (type === 'multiple' && (q.correctIndices ?? []).length === 0) out.push(`${label} «${name}»: вопрос ${i + 1} — не отмечен ни один верный вариант.`);
    }
  });
  return out;
}

function collectBlockIssues(block: BlockCreate, lessonName: string): string[] {
  const out: string[] = [];
  if (block.type === 'open_answer') {
    let d: { prompt?: string } = {};
    try { d = JSON.parse(block.content || '{}'); } catch { /* malformed */ }
    if (!d.prompt?.trim()) out.push(`Урок «${lessonName}»: открытый ответ без вопроса.`);
  }
  if (block.type === 'quiz') {
    let d: { question?: string; options?: string[] } = {};
    try { d = JSON.parse(block.content || '{}'); } catch { /* malformed */ }
    if (!d.question?.trim()) out.push(`Урок «${lessonName}»: проверочный вопрос без текста.`);
    else if ((d.options ?? []).filter((o) => o.trim()).length < 2) out.push(`Урок «${lessonName}»: в проверочном вопросе меньше 2 вариантов.`);
  }
  return out;
}

export function CourseConstructor() {
  const { courseId } = useParams<{ courseId?: string }>();
  const navigate = useNavigate();
  const isEditMode = !!courseId;

  // ── Resizable left panel ─────────────────────────────────────────────────
  const COLLAPSED_W = 76;
  const EXPAND_MIN  = 240;
  const [leftWidth, setLeftWidth] = useState(300);
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const effectiveWidth = leftWidth < EXPAND_MIN ? COLLAPSED_W : leftWidth;
  const leftCollapsed = effectiveWidth === COLLAPSED_W;
  const toggleLeftPanel = () => setLeftWidth((w) => (w < EXPAND_MIN ? 300 : COLLAPSED_W));

  // Фокус-режим: скрывает глобальный сайдбар, расширяя рабочую зону конструктора
  const [focusMode, setFocusMode] = useState(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const raw = ev.clientX - rect.left;
      setLeftWidth(Math.max(COLLAPSED_W, Math.min(520, raw)));
    };
    const onUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setLeftWidth(prev => prev < EXPAND_MIN ? COLLAPSED_W : prev);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const [courseTitle, setCourseTitle] = useState('Новый курс');
  const [courseDescription, setCourseDescription] = useState('');
  // Настройки прохождения
  const [sequential, setSequential] = useState(false);
  const [requireVideo, setRequireVideo] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const [modules, setModules] = useState<ModuleCreate[]>([]);
  const [rootModuleId, setRootModuleId] = useState<string>(() => genId());
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Идентификатор курса: из URL (режим редактирования) или присваивается при первом сохранении
  const [currentCourseId, setCurrentCourseId] = useState<string | undefined>(courseId);
  const isPersisted = !!currentCourseId;
  const [dirty, setDirty] = useState(false);
  const hydratedRef = useRef(false);
  const savingRef = useRef(false);

  // Модалки
  const [showValidation, setShowValidation] = useState(false);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Load course if editing
  useEffect(() => {
    if (!isEditMode) {
      // New course: inject root module
      const rootId = rootModuleId;
      setModules([{ id: rootId, title: '__root__', order: 9999, lessons: [], tests: [] }]);
      setLoading(false);
      requestAnimationFrame(() => { hydratedRef.current = true; });
      return;
    }
    apiGet<CourseRead>(`/api/courses/${courseId}`)
      .then((data) => {
        setCourseTitle(data.title);
        setCourseDescription(data.description || '');
        setSequential(data.sequential ?? false);
        setRequireVideo(data.require_video ?? false);
        if (data.cover_image) setCoverImage(data.cover_image);
        const mods: ModuleCreate[] = data.modules.map((m) => ({
          id: m.id,
          title: m.title,
          order: m.order,
          lessons: m.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            type: l.type,
            duration: l.duration,
            order: l.order,
            blocks: l.blocks.map((b) => ({
              id: b.id,
              type: b.type,
              content: b.content,
              order: b.order,
            })),
          })),
          tests: (m.tests ?? []).map((t) => ({
            id: t.id,
            type: t.type,
            title: t.title,
            content: t.content,
            order: t.order,
          })),
        }));
        // Find or inject root module
        const existingRoot = mods.find((m) => m.title === '__root__');
        const rootId = existingRoot?.id ?? rootModuleId;
        if (!existingRoot) {
          mods.push({ id: rootId, title: '__root__', order: 9999, lessons: [], tests: [] });
        }
        setRootModuleId(rootId);
        setModules(mods);
        const normalMods = mods.filter((m) => m.title !== '__root__');
        if (normalMods.length > 0 && normalMods[0].lessons.length > 0) {
          setActiveItem({ kind: 'lesson', id: normalMods[0].lessons[0].id });
        }
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        requestAnimationFrame(() => { hydratedRef.current = true; });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, isEditMode]);

  const uploadCoverToServer = async (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}/api/courses/${id}/cover`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    return data.cover_image as string;
  };

  const buildPayload = useCallback((id: string) => ({
    id,
    title: courseTitle,
    description: courseDescription,
    sequential,
    require_video: requireVideo,
    modules: modules.map((m, mi) => ({
      ...m,
      order: mi,
      lessons: m.lessons.map((l, li) => ({
        ...l,
        order: li,
        duration: l.duration || '15 мин',
        blocks: l.blocks.map((b, bi) => ({ ...b, order: bi })),
      })),
      tests: m.tests.map((t, ti) => ({ ...t, order: ti })),
    })),
  }), [courseTitle, courseDescription, sequential, requireVideo, modules]);

  // Единое ядро сохранения. silent=true — автосохранение (без переходов фокуса).
  const saveCore = useCallback(async (silent: boolean) => {
    if (savingRef.current) return;  // не допускаем параллельных сохранений
    savingRef.current = true;
    setSaveStatus('saving');
    const id = currentCourseId || genId();
    const persisted = !!currentCourseId;
    const payload = buildPayload(id);
    try {
      if (persisted) {
        await apiPut(`/api/courses/${id}`, payload);
      } else {
        await apiPost('/api/courses/', payload);
        setCurrentCourseId(id);
        // Меняем URL на режим редактирования без перемонтирования компонента
        window.history.replaceState(null, '', `/hr/courses/${id}/edit`);
      }
      if (pendingCoverFile) {
        const url = await uploadCoverToServer(id, pendingCoverFile);
        setCoverImage(url);
        setPendingCoverFile(null);
      }
      setDirty(false);
      setSaveStatus('idle');
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      if (!silent) setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      savingRef.current = false;
    }
  }, [currentCourseId, buildPayload, pendingCoverFile]);

  // ── Pre-publish validation ────────────────────────────────────────────────
  const validateCourse = useCallback((): string[] => {
    const issues: string[] = [];
    if (!courseTitle.trim() || courseTitle.trim() === 'Новый курс') {
      issues.push('У курса нет осмысленного названия.');
    }
    const normal = modules.filter((m) => m.id !== rootModuleId);
    if (normal.length === 0) issues.push('В курсе нет ни одного модуля.');
    let totalLessons = 0;
    for (const m of normal) {
      if (m.lessons.length === 0 && m.tests.length === 0) {
        issues.push(`Модуль «${m.title?.trim() || 'без названия'}» пустой.`);
      }
      for (const l of m.lessons) {
        totalLessons++;
        const name = l.title?.trim() || 'без названия';
        if (l.blocks.length === 0) issues.push(`Урок «${name}» не содержит блоков.`);
        for (const b of l.blocks) issues.push(...collectBlockIssues(b, name));
      }
      for (const t of m.tests) issues.push(...collectTestIssues(t, 'Тест'));
    }
    const root = modules.find((m) => m.id === rootModuleId);
    if (root) {
      for (const l of root.lessons) {
        totalLessons++;
        const name = l.title?.trim() || 'без названия';
        if (l.blocks.length === 0) issues.push(`Итоговый урок «${name}» не содержит блоков.`);
        for (const b of l.blocks) issues.push(...collectBlockIssues(b, name));
      }
      for (const t of root.tests) issues.push(...collectTestIssues(t, 'Итоговый тест'));
    }
    if (totalLessons === 0) issues.push('В курсе нет ни одного урока.');
    return issues;
  }, [courseTitle, modules, rootModuleId]);

  const manualSave = useCallback(() => {
    const issues = validateCourse();
    if (issues.length > 0) {
      setValidationIssues(issues);
      setShowValidation(true);
      return;
    }
    saveCore(false);
  }, [validateCourse, saveCore]);

  // ── Dirty tracking + autosave + guards ──────────────────────────────────────
  useEffect(() => {
    if (!hydratedRef.current) return;
    setDirty(true);
  }, [courseTitle, courseDescription, sequential, requireVideo, modules]);

  useEffect(() => {
    if (!dirty) return;
    const hasContent =
      isPersisted ||
      (courseTitle.trim() !== '' && courseTitle.trim() !== 'Новый курс') ||
      modules.some((m) => m.id !== rootModuleId && (m.lessons.length > 0 || m.tests.length > 0));
    if (!hasContent) return;
    const t = setTimeout(() => { saveCore(true); }, 1500);
    return () => clearTimeout(t);
  }, [dirty, isPersisted, courseTitle, modules, rootModuleId, saveCore]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty || saveStatus === 'saving') { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, saveStatus]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        manualSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [manualSave]);

  // Авто-высота поля описания: растёт под текст, дальше внутренний скролл
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [courseDescription]);

  const handleBack = () => {
    if (dirty && !window.confirm('Есть несохранённые изменения. Покинуть страницу?')) return;
    navigate('/hr/courses');
  };

  const handleCoverPick = (file: File) => {
    if (coverPreview && coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    const blobUrl = URL.createObjectURL(file);
    setCoverPreview(blobUrl);
    setPendingCoverFile(file);
    if (courseId) {
      setCoverUploading(true);
      uploadCoverToServer(courseId, file)
        .then((url) => { setCoverImage(url); setPendingCoverFile(null); setCoverPreview(null); })
        .catch(console.error)
        .finally(() => setCoverUploading(false));
    }
  };

  const displayCover = coverPreview || (coverImage ? `${API_BASE_URL}${coverImage}` : null);

  // ── Module helpers ────────────────────────────────────────────────────────
  const addModule = () =>
    setModules((prev) => {
      const normalCount = prev.filter((m) => m.id !== rootModuleId).length;
      const newMod = { id: genId(), title: `Модуль ${normalCount + 1}`, order: normalCount, lessons: [], tests: [] };
      // Insert before root module
      const withoutRoot = prev.filter((m) => m.id !== rootModuleId);
      const root = prev.find((m) => m.id === rootModuleId);
      return root ? [...withoutRoot, newMod, root] : [...withoutRoot, newMod];
    });

  // Стартовый шаблон: модуль → урок с текстовым блоком → тест модуля.
  // Демонстрирует всю иерархию и снимает «страх пустого листа» у нового HR.
  const createFromTemplate = () => {
    const lessonId = genId();
    const newModule: ModuleCreate = {
      id: genId(),
      title: 'Модуль 1. Введение',
      order: 0,
      lessons: [
        {
          id: lessonId,
          title: 'Урок 1. С чего начать',
          type: 'text',
          duration: '10 мин',
          order: 0,
          blocks: [
            {
              id: genId(),
              type: 'text',
              content:
                '<h2>Добро пожаловать в курс</h2><p>Замените этот текст материалом урока. Чтобы отформатировать — выделите текст или используйте панель «Формат» сверху. Блоки ниже можно перетаскивать, дублировать и удалять.</p>',
              order: 0,
            },
          ],
        },
      ],
      tests: [
        {
          id: genId(),
          type: 'module',
          title: 'Проверка по модулю 1',
          content: JSON.stringify({ questions: [], pass_threshold: 70 }),
          order: 0,
        },
      ],
    };
    setModules((prev) => {
      const withoutRoot = prev.filter((m) => m.id !== rootModuleId);
      const root = prev.find((m) => m.id === rootModuleId);
      return root ? [...withoutRoot, newModule, root] : [...withoutRoot, newModule];
    });
    setActiveItem({ kind: 'lesson', id: lessonId });
  };

  const deleteModule = (id: string) => {
    if (id === rootModuleId) return; // root module is protected
    setModules((prev) => prev.filter((m) => m.id !== id));
  };

  const updateModuleTitle = (id: string, title: string) =>
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, title } : m)));

  // ── Lesson helpers ────────────────────────────────────────────────────────
  const addLesson = (moduleId: string) => {
    const newLesson: LessonCreate = {
      id: genId(),
      title: '',
      type: 'text',
      duration: '15 мин',
      order: 0,
      blocks: [],
    };
    setActiveItem({ kind: 'lesson', id: newLesson.id });
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, lessons: [...m.lessons, newLesson] } : m
      )
    );
  };

  const deleteLesson = (moduleId: string, lessonId: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }
          : m
      )
    );
    if (activeItem?.kind === 'lesson' && activeItem.id === lessonId) setActiveItem(null);
  };

  const updateLessonTitle = (title: string) => {
    if (!activeItem || activeItem.kind !== 'lesson') return;
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) =>
          l.id === activeItem.id ? { ...l, title } : l
        ),
      }))
    );
  };

  const updateLessonMeta = (patch: { duration?: string; type?: string }) => {
    if (!activeItem || activeItem.kind !== 'lesson') return;
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) =>
          l.id === activeItem.id ? { ...l, ...patch } : l
        ),
      }))
    );
  };

  // ── Block helpers ─────────────────────────────────────────────────────────
  const addBlock = (type: string, afterIndex?: number) => {
    if (!activeItem || activeItem.kind !== 'lesson') return;
    const newBlock: BlockCreate = { id: genId(), type, content: '', order: 0 };
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => {
          if (l.id !== activeItem.id) return l;
          if (afterIndex === undefined || afterIndex >= l.blocks.length) {
            return { ...l, blocks: [...l.blocks, newBlock] };
          }
          const next = [...l.blocks];
          next.splice(afterIndex + 1, 0, newBlock);
          return { ...l, blocks: next };
        }),
      }))
    );
  };

  const updateBlock = (blockId: string, content: string) => {
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => ({
          ...l,
          blocks: l.blocks.map((b) => (b.id === blockId ? { ...b, content } : b)),
        })),
      }))
    );
  };

  const deleteBlock = (blockId: string) => {
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => ({
          ...l,
          blocks: l.blocks.filter((b) => b.id !== blockId),
        })),
      }))
    );
  };

  const reorderBlocks = (newBlocks: BlockCreate[]) => {
    if (!activeItem || activeItem.kind !== 'lesson') return;
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) =>
          l.id === activeItem.id ? { ...l, blocks: newBlocks } : l
        ),
      }))
    );
  };

  // Конвертация блока (из slash-меню): меняем тип и сбрасываем содержимое
  const convertBlock = (blockId: string, type: string) => {
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => ({
          ...l,
          blocks: l.blocks.map((b) => (b.id === blockId ? { ...b, type, content: '' } : b)),
        })),
      }))
    );
  };

  // Дублирование блока: копия с новым id сразу после оригинала
  const duplicateBlock = (blockId: string) => {
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => {
          const idx = l.blocks.findIndex((b) => b.id === blockId);
          if (idx === -1) return l;
          const copy: BlockCreate = { ...l.blocks[idx], id: genId() };
          const next = [...l.blocks];
          next.splice(idx + 1, 0, copy);
          return { ...l, blocks: next };
        }),
      }))
    );
  };

  // Восстановление удалённого блока (undo) в активном уроке по индексу
  const restoreBlock = (block: BlockCreate, index: number) => {
    if (!activeItem || activeItem.kind !== 'lesson') return;
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => {
          if (l.id !== activeItem.id) return l;
          const next = [...l.blocks];
          next.splice(Math.min(index, next.length), 0, block);
          return { ...l, blocks: next };
        }),
      }))
    );
  };

  // ── Reorder helpers ───────────────────────────────────────────────────────
  const reorderModules = (newModules: ModuleCreate[]) => setModules(newModules);

  const reorderLessons = (moduleId: string, newLessons: LessonCreate[]) =>
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, lessons: newLessons } : m))
    );

  const reorderTests = (moduleId: string, newTests: ModuleTest[]) =>
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, tests: newTests } : m))
    );

  // ── Test helpers ──────────────────────────────────────────────────────────
  const addTest = (moduleId: string) => {
    const newTest: ModuleTest = {
      id: genId(),
      type: 'module',
      title: '',
      content: JSON.stringify({ questions: [], pass_threshold: 70 }),
      order: 0,
    };
    setActiveItem({ kind: 'test', id: newTest.id });
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId ? { ...m, tests: [...m.tests, newTest] } : m
      )
    );
  };

  const deleteTest = (moduleId: string, testId: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, tests: m.tests.filter((t) => t.id !== testId) }
          : m
      )
    );
    if (activeItem?.kind === 'test' && activeItem.id === testId) setActiveItem(null);
  };

  // ── Root-level helpers ────────────────────────────────────────────────────
  const addRootLesson = () => addLesson(rootModuleId);

  const addRootTest = () => {
    const newTest: ModuleTest = {
      id: genId(),
      type: 'final',
      title: '',
      content: JSON.stringify({ questions: [], pass_threshold: 70 }),
      order: 0,
    };
    setActiveItem({ kind: 'test', id: newTest.id });
    setModules((prev) =>
      prev.map((m) =>
        m.id === rootModuleId ? { ...m, tests: [...m.tests, newTest] } : m
      )
    );
  };

  const updateTest = (updated: ModuleTest) => {
    setModules((prev) =>
      prev.map((m) => ({
        ...m,
        tests: m.tests.map((t) => (t.id === updated.id ? updated : t)),
      }))
    );
  };

  // ── Derived active entities ───────────────────────────────────────────────
  const allLessons = modules.flatMap((m) => m.lessons);
  const allTests   = modules.flatMap((m) => m.tests);
  const activeLesson = activeItem?.kind === 'lesson'
    ? allLessons.find((l) => l.id === activeItem.id)
    : undefined;
  const activeTest = activeItem?.kind === 'test'
    ? allTests.find((t) => t.id === activeItem.id)
    : undefined;

  // Онбординг: курс пуст (нет ни модулей, ни итоговых уроков/тестов) и ничего не выбрано
  const normalModuleList = modules.filter((m) => m.id !== rootModuleId);
  const rootMod = modules.find((m) => m.id === rootModuleId);
  const showOnboarding =
    !activeItem &&
    normalModuleList.length === 0 &&
    (!rootMod || (rootMod.lessons.length === 0 && rootMod.tests.length === 0));

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 font-bold">Загрузка...</p>
      </div>
    );
  }

  return (
    <PageLayout sidebar={focusMode ? undefined : <Sidebar />}>
      {/* Navbar */}
      <nav className="glass-nav rounded-[2rem] px-6 py-3 mx-6 mt-6 mb-4 flex justify-between items-center shadow-[0_4px_30px_rgba(0,0,0,0.05)] shrink-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-600 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setFocusMode((v) => !v)}
            title={focusMode ? 'Показать меню' : 'Скрыть меню — больше места'}
            className="w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-600 hover:text-brand transition-colors shadow-sm"
          >
            {focusMode ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2 group">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden sm:block">Курс:</span>
            <input
              type="text"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              className="font-extrabold text-slate-800 bg-transparent border-none focus:outline-none hover:bg-white/50 focus:bg-white px-2 py-1 rounded transition-colors min-w-[150px]"
            />
            <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Honest save status */}
          {saveStatus === 'saving' ? (
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/60 px-2 py-1 rounded-md flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />Сохраняем…
            </span>
          ) : saveStatus === 'error' ? (
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest bg-red-50 px-2 py-1 rounded-md">Ошибка сохранения</span>
          ) : dirty ? (
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-md hidden sm:flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Несохранённые изменения
            </span>
          ) : isPersisted ? (
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md hidden sm:flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />Все изменения сохранены
            </span>
          ) : (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white/60 px-2 py-1 rounded-md hidden sm:flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />Черновик
            </span>
          )}

          {/* Help */}
          <button
            onClick={() => setShowHelp(true)}
            className="w-9 h-9 bg-white border border-slate-200 hover:border-brand/40 text-slate-400 hover:text-brand rounded-full transition-all flex items-center justify-center shrink-0"
            title="Как собрать курс — справка"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Preview */}
          <button
            onClick={() => setShowPreview(true)}
            disabled={!activeItem}
            className="px-4 py-2 bg-white border border-slate-200 hover:border-brand/40 hover:text-brand text-slate-600 rounded-full text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            title="Предпросмотр как видит сотрудник"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Превью</span>
          </button>

          <button
            onClick={manualSave}
            disabled={saveStatus === 'saving'}
            className="px-5 py-2 bg-slate-900 hover:bg-brand text-white rounded-full text-sm font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {isPersisted ? 'Обновить' : 'Опубликовать'}
          </button>
        </div>
      </nav>

      {/* Description + Cover — единый блок */}
      <div className="px-6 mb-4">
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCoverPick(file);
            e.target.value = '';
          }}
        />
        <div className="flex items-stretch gap-0 bg-white border border-slate-200 rounded-2xl overflow-hidden focus-within:border-brand/40 transition-all group/card shadow-sm">
          {/* Описание */}
          <div className="flex-1 relative flex items-start">
            <div className="absolute left-4 top-3 text-slate-300 group-focus-within/card:text-brand transition-colors pointer-events-none">
              <AlignLeft className="w-4 h-4" />
            </div>
            <textarea
              ref={descRef}
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)}
              placeholder="Краткое описание курса — о чём он и для кого…"
              rows={1}
              className="w-full resize-none bg-transparent pl-10 pr-4 py-3 text-slate-600 text-sm outline-none leading-relaxed placeholder:text-slate-300"
              style={{ maxHeight: 100, overflowY: 'auto' }}
            />
          </div>

          {/* Разделитель */}
          <div className="w-px bg-slate-200/70 self-stretch shrink-0" />

          {/* Обложка */}
          {displayCover ? (
            <div className="relative shrink-0 group/cover cursor-pointer self-stretch" style={{ width: 110 }} onClick={() => coverInputRef.current?.click()}>
              <img
                src={displayCover}
                alt="Обложка"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <ImagePlus className="w-4 h-4 text-white" />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
                  setCoverImage(null); setCoverPreview(null); setPendingCoverFile(null);
                }}
                className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/60 text-white rounded-full items-center justify-center hidden group-hover/cover:flex"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              className="shrink-0 px-4 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-brand hover:bg-brand/5 transition-all disabled:opacity-60"
              style={{ width: 90 }}
            >
              <ImagePlus className="w-5 h-5" />
              <span className="text-[11px] font-semibold">{coverUploading ? 'Загрузка…' : 'Обложка'}</span>
            </button>
          )}
        </div>

        {/* Настройки прохождения */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Прохождение:</span>
          <button
            onClick={() => setSequential((v) => !v)}
            title="Следующий урок/тест откроется только после прохождения предыдущего"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
              sequential ? 'bg-brand text-white border-brand shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:border-brand/40'
            }`}
          >
            <Lock className="w-3 h-3" /> Последовательное
          </button>
          <button
            onClick={() => setRequireVideo((v) => !v)}
            title="Урок с видео нельзя завершить, пока ролик не досмотрен (≈90%)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
              requireVideo ? 'bg-brand text-white border-brand shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:border-brand/40'
            }`}
          >
            <PlayCircle className="w-3 h-3" /> Обязательный просмотр видео
          </button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div ref={containerRef} className="flex-1 overflow-hidden px-6 pb-6 flex min-h-0" style={{ gap: 0 }}>

        {/* Left: Syllabus */}
        <div
          className="shrink-0 overflow-y-auto transition-[width] duration-150"
          style={{ width: effectiveWidth }}
        >
          <SyllabusPanel
            width={leftWidth}
            collapsed={leftCollapsed}
            onToggleCollapse={toggleLeftPanel}
            modules={modules}
            activeItem={activeItem}
            rootModuleId={rootModuleId}
            onSelectLesson={(id) => setActiveItem({ kind: 'lesson', id })}
            onSelectTest={(id) => setActiveItem({ kind: 'test', id })}
            onAddModule={addModule}
            onAddLesson={addLesson}
            onAddTest={addTest}
            onAddRootLesson={addRootLesson}
            onAddRootTest={addRootTest}
            onUpdateModuleTitle={updateModuleTitle}
            onDeleteModule={deleteModule}
            onDeleteLesson={deleteLesson}
            onDeleteTest={deleteTest}
            onReorderModules={reorderModules}
            onReorderLessons={reorderLessons}
            onReorderTests={reorderTests}
          />
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={startResize}
          className="shrink-0 w-3 mx-1.5 flex items-center justify-center cursor-col-resize group/resize"
          title="Потяните чтобы изменить размер"
        >
          <div className="w-[3px] h-16 rounded-full bg-slate-200 group-hover/resize:bg-brand/60 transition-colors" />
        </div>

        {/* Right: Onboarding, Editor or Test editor */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          {showOnboarding ? (
            <CourseOnboarding onUseTemplate={createFromTemplate} onAddModule={addModule} />
          ) : activeItem?.kind === 'test' && activeTest ? (
            <ModuleTestEditor
              test={activeTest}
              onChange={updateTest}
            />
          ) : (
            <EditorPanel
              lesson={activeLesson}
              onUpdateTitle={updateLessonTitle}
              onUpdateMeta={updateLessonMeta}
              onAddBlock={addBlock}
              onUpdateBlock={updateBlock}
              onConvertBlock={convertBlock}
              onDuplicateBlock={duplicateBlock}
              onDeleteBlock={deleteBlock}
              onRestoreBlock={restoreBlock}
              onReorderBlocks={reorderBlocks}
              onOpenHelp={() => setShowHelp(true)}
            />
          )}
        </div>

      </div>

      {/* Pre-publish validation */}
      <Modal isOpen={showValidation} onClose={() => setShowValidation(false)} title="Курс готов не полностью">
        <p className="text-sm text-slate-500 font-medium mb-4">
          Перед публикацией стоит исправить {validationIssues.length} {validationIssues.length === 1 ? 'пункт' : 'пунктов'}:
        </p>
        <ul className="space-y-2 max-h-72 overflow-y-auto mb-6">
          {validationIssues.map((issue, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 font-medium bg-amber-50/60 border border-amber-100 rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              {issue}
            </li>
          ))}
        </ul>
        <div className="flex gap-3">
          <button
            onClick={() => setShowValidation(false)}
            className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Вернуться и исправить
          </button>
          <button
            onClick={() => { setShowValidation(false); saveCore(false); }}
            className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 transition-colors"
          >
            Сохранить всё равно
          </button>
        </div>
      </Modal>

      {/* Student preview */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Предпросмотр · как видит сотрудник" maxWidth="max-w-3xl">
        <div className="max-h-[70vh] overflow-y-auto pr-1 -mr-1">
          <LessonPreview lesson={activeLesson} test={activeTest} />
        </div>
      </Modal>

      {/* Constructor help */}
      <ConstructorHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </PageLayout>
  );
}
