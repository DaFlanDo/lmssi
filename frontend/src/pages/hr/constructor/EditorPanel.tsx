import { useRef, useEffect, useState, useReducer } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type Editor } from '@tiptap/react';
import {
  GripVertical, Trash2, Type, Video as VideoIcon, Plus, Clock, Copy, Undo2,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Link as LinkIcon, HelpCircle,
} from 'lucide-react';
import type { BlockCreate, LessonCreate } from '../../../types';
import { BLOCK_TYPES } from './blockTypes';
import { TextBlock } from './blocks/TextBlock';
import { VideoBlock } from './blocks/VideoBlock';
import { QuizBlock } from './blocks/QuizBlock';
import { AiBlock } from './blocks/AiBlock';
import { CalloutBlock } from './blocks/CalloutBlock';
import { ChecklistBlock } from './blocks/ChecklistBlock';
import { OpenAnswerBlock } from './blocks/OpenAnswerBlock';

interface Props {
  lesson: LessonCreate | undefined;
  onUpdateTitle: (title: string) => void;
  onUpdateMeta: (patch: { duration?: string; type?: string }) => void;
  onAddBlock: (type: string, afterIndex?: number) => void;
  onUpdateBlock: (blockId: string, content: string) => void;
  onConvertBlock: (blockId: string, type: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onRestoreBlock: (block: BlockCreate, index: number) => void;
  onReorderBlocks: (blocks: BlockCreate[]) => void;
  onOpenHelp?: () => void;
}

// ── Static format toolbar (управляет активным Tiptap-редактором) ──────────────
function ToolBtn({
  active, disabled, onClick, title, children,
}: { active?: boolean; disabled?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded-lg transition-all ${
        disabled
          ? 'text-slate-300 cursor-not-allowed'
          : active
            ? 'bg-slate-800 text-white shadow-sm'
            : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

function ToolSep() {
  return <div className="w-px h-5 bg-slate-200 mx-1 shrink-0" />;
}

function StaticToolbar({ editor }: { editor: Editor | null }) {
  const [, force] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    if (!editor) return;
    const update = () => force();
    editor.on('transaction', update);
    editor.on('selectionUpdate', update);
    return () => {
      editor.off('transaction', update);
      editor.off('selectionUpdate', update);
    };
  }, [editor]);

  const can = !!editor && !editor.isDestroyed;
  const isActive = (name: string, attrs?: Record<string, unknown>) => can && editor!.isActive(name, attrs);

  const setLink = () => {
    if (!can) return;
    const prev = editor!.getAttributes('link').href as string | undefined;
    const url = window.prompt('Ссылка (URL):', prev || 'https://');
    if (url === null) return;
    if (url === '') { editor!.chain().focus().unsetLink().run(); return; }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className={`flex items-center gap-1 flex-wrap ${can ? '' : 'opacity-50'}`}>
      <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl px-1.5 py-1">
        <ToolBtn disabled={!can} title="Заголовок 1" active={isActive('heading', { level: 1 })} onClick={() => editor!.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="w-4 h-4" /></ToolBtn>
        <ToolBtn disabled={!can} title="Заголовок 2" active={isActive('heading', { level: 2 })} onClick={() => editor!.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="w-4 h-4" /></ToolBtn>
        <ToolBtn disabled={!can} title="Заголовок 3" active={isActive('heading', { level: 3 })} onClick={() => editor!.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="w-4 h-4" /></ToolBtn>
      </div>
      <ToolSep />
      <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl px-1.5 py-1">
        <ToolBtn disabled={!can} title="Жирный" active={isActive('bold')} onClick={() => editor!.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></ToolBtn>
        <ToolBtn disabled={!can} title="Курсив" active={isActive('italic')} onClick={() => editor!.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolBtn>
        <ToolBtn disabled={!can} title="Подчёркнутый" active={isActive('underline')} onClick={() => editor!.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-4 h-4" /></ToolBtn>
        <ToolBtn disabled={!can} title="Зачёркнутый" active={isActive('strike')} onClick={() => editor!.chain().focus().toggleStrike().run()}><Strikethrough className="w-4 h-4" /></ToolBtn>
        <ToolBtn disabled={!can} title="Код" active={isActive('code')} onClick={() => editor!.chain().focus().toggleCode().run()}><Code className="w-4 h-4" /></ToolBtn>
      </div>
      <ToolSep />
      <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl px-1.5 py-1">
        <ToolBtn disabled={!can} title="Маркированный список" active={isActive('bulletList')} onClick={() => editor!.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></ToolBtn>
        <ToolBtn disabled={!can} title="Нумерованный список" active={isActive('orderedList')} onClick={() => editor!.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></ToolBtn>
        <ToolBtn disabled={!can} title="Цитата" active={isActive('blockquote')} onClick={() => editor!.chain().focus().toggleBlockquote().run()}><Quote className="w-4 h-4" /></ToolBtn>
        <ToolBtn disabled={!can} title="Ссылка" active={isActive('link')} onClick={setLink}><LinkIcon className="w-4 h-4" /></ToolBtn>
      </div>
    </div>
  );
}

// ── Block content renderer ────────────────────────────────────────────────────
function BlockContent({
  block, onUpdateBlock, onConvertBlock, onActivate,
}: {
  block: BlockCreate;
  onUpdateBlock: (id: string, v: string) => void;
  onConvertBlock: (id: string, type: string) => void;
  onActivate: (editor: Editor) => void;
}) {
  return (
    <>
      {block.type === 'text'      && <TextBlock      value={block.content}   onChange={(v) => onUpdateBlock(block.id, v)} onSlashCommand={(type) => onConvertBlock(block.id, type)} onActivate={onActivate} />}
      {block.type === 'video'     && <VideoBlock     content={block.content} onChange={(v) => onUpdateBlock(block.id, v)} />}
      {block.type === 'quiz'      && <QuizBlock      content={block.content} onChange={(v) => onUpdateBlock(block.id, v)} />}
      {block.type === 'callout'   && <CalloutBlock   content={block.content} onChange={(v) => onUpdateBlock(block.id, v)} />}
      {block.type === 'checklist' && <ChecklistBlock content={block.content} onChange={(v) => onUpdateBlock(block.id, v)} />}
      {block.type === 'open_answer' && <OpenAnswerBlock content={block.content} onChange={(v) => onUpdateBlock(block.id, v)} />}
      {block.type === 'ai'        && <AiBlock        content={block.content} onChange={(v) => onUpdateBlock(block.id, v)} />}
    </>
  );
}

// ── Sortable block row ────────────────────────────────────────────────────────
function SortableBlock({
  block, onUpdateBlock, onConvertBlock, onActivate, onDuplicate, onDelete,
}: {
  block: BlockCreate;
  onUpdateBlock: (id: string, v: string) => void;
  onConvertBlock: (id: string, type: string) => void;
  onActivate: (editor: Editor) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group/block flex items-start gap-3 rounded-2xl transition-colors hover:bg-slate-50/60 py-1 px-1 -mx-1"
    >
      {/* Left gutter */}
      <div className="shrink-0 flex flex-col items-center gap-1 pt-2 opacity-0 group-hover/block:opacity-100 transition-opacity w-6">
        <button
          {...attributes}
          {...listeners}
          className="w-6 h-6 rounded-md hover:bg-slate-200 text-slate-400 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
          tabIndex={-1}
          title="Перетащить"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDuplicate(block.id)}
          className="w-6 h-6 rounded-md hover:bg-brand/10 hover:text-brand text-slate-400 flex items-center justify-center transition-colors"
          title="Дублировать блок"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(block.id)}
          className="w-6 h-6 rounded-md hover:bg-red-100 hover:text-red-500 text-slate-400 flex items-center justify-center transition-colors"
          title="Удалить блок"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Block content */}
      <div className="flex-1 min-w-0">
        <BlockContent block={block} onUpdateBlock={onUpdateBlock} onConvertBlock={onConvertBlock} onActivate={onActivate} />
      </div>
    </div>
  );
}

function AutoResizeTextarea({
  value, onChange, placeholder, className,
}: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`resize-none overflow-hidden ${className || ''}`}
      rows={1}
    />
  );
}

// ── Inline "insert after block N" separator ─────────────────────────────────
function InsertSeparator({ onAdd }: { onAdd: (type: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative flex items-center gap-2 py-1 group/sep"
      onMouseLeave={() => setOpen(false)}
    >
      <div className="flex-1 h-px bg-slate-100 group-hover/sep:bg-slate-200 transition-colors" />
      <button
        onClick={() => setOpen((v) => !v)}
        className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
          open
            ? 'bg-brand border-brand text-white shadow'
            : 'bg-white border-slate-200 text-slate-400 opacity-0 group-hover/sep:opacity-100 hover:border-brand hover:text-brand'
        }`}
      >
        <Plus className="w-3 h-3" />
      </button>
      <div className="flex-1 h-px bg-slate-100 group-hover/sep:bg-slate-200 transition-colors" />

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-8 z-40 flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl px-3 py-2 flex-wrap max-w-[520px] justify-center">
          {BLOCK_TYPES.map(({ type, label, Icon, pill, hint }) => (
            <button
              key={type}
              onClick={() => { onAdd(type); setOpen(false); }}
              title={hint}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${pill}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bottom "always visible" add-block strip ─────────────────────────────────
function AddBlockStrip({ onAdd, onOpenHelp }: { onAdd: (type: string) => void; onOpenHelp?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-4 pb-2 border-t border-slate-100 mt-6">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
        Добавить:
      </span>
      {BLOCK_TYPES.map(({ type, label, Icon, pill, hint }) => (
        <button
          key={type}
          onClick={() => onAdd(type)}
          title={hint}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${pill}`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
      {onOpenHelp && (
        <button
          onClick={onOpenHelp}
          title="Что это за блоки? — подробнее"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border border-dashed border-slate-200 text-slate-400 hover:text-brand hover:border-brand/40 transition-all"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Что выбрать?
        </button>
      )}
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────
export function EditorPanel({
  lesson, onUpdateTitle, onUpdateMeta, onAddBlock, onUpdateBlock,
  onConvertBlock, onDuplicateBlock, onDeleteBlock, onRestoreBlock, onReorderBlocks, onOpenHelp,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Undo для удалённого блока
  const [undoBlock, setUndoBlock] = useState<{ block: BlockCreate; index: number } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Активный текстовый редактор для статической панели форматирования
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);

  const handleDelete = (blockId: string) => {
    if (!lesson) return;
    const index = lesson.blocks.findIndex((b) => b.id === blockId);
    if (index === -1) return;
    const block = lesson.blocks[index];
    onDeleteBlock(blockId);
    setUndoBlock({ block, index });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoBlock(null), 6000);
  };

  const handleUndo = () => {
    if (!undoBlock) return;
    onRestoreBlock(undoBlock.block, undoBlock.index);
    setUndoBlock(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  // Сбрасываем undo и активный редактор при переключении урока
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- осознанный сброс при смене урока
    setUndoBlock(null);
    setActiveEditor(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, [lesson?.id]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !lesson) return;
    const oldIdx = lesson.blocks.findIndex((b) => b.id === active.id);
    const newIdx = lesson.blocks.findIndex((b) => b.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) {
      onReorderBlocks(arrayMove(lesson.blocks, oldIdx, newIdx));
    }
  };

  if (!lesson) {
    return (
      <div className="bento-card md:col-span-8 bg-white/90 backdrop-blur-xl flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Type className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-400 font-medium">Выберите или создайте урок слева</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bento-card bg-white/90 backdrop-blur-xl flex flex-col h-full relative">

      {/* Pinned format toolbar — управляет активным текстовым блоком */}
      <div className="shrink-0 border-b border-slate-100 px-6 py-2.5 flex items-center gap-3 flex-wrap rounded-t-[28px] bg-slate-50/80">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 select-none">Формат</span>
        <StaticToolbar editor={activeEditor} />
        <span className="ml-auto text-[10px] text-slate-300 font-semibold hidden lg:block select-none">
          {activeEditor ? 'или выделите текст' : 'поставьте курсор в текст'}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-10 py-8 pb-16">

        {/* Lesson title */}
        <AutoResizeTextarea
          value={lesson.title}
          onChange={onUpdateTitle}
          className="w-full text-4xl lg:text-5xl font-black text-slate-900 leading-tight bg-transparent border-none outline-none mb-4 placeholder-slate-200"
          placeholder="Заголовок урока"
        />

        {/* Lesson meta: type + duration */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {([
              { v: 'text', label: 'Текст', Icon: Type },
              { v: 'video', label: 'Видео', Icon: VideoIcon },
            ] as const).map(({ v, label, Icon }) => (
              <button
                key={v}
                onClick={() => onUpdateMeta({ type: v })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  lesson.type === v ? 'bg-white text-brand shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <input
              value={lesson.duration}
              onChange={(e) => onUpdateMeta({ duration: e.target.value })}
              placeholder="15 мин"
              className="w-20 bg-transparent outline-none text-xs font-bold text-slate-600 placeholder-slate-300"
            />
          </div>
        </div>

        {/* Empty state */}
        {lesson.blocks.length === 0 && (
          <p className="text-slate-300 text-lg font-medium italic select-none mb-4">
            Добавьте первый блок ниже или нажмите «/» в тексте…
          </p>
        )}

        {/* Blocks with insert separators — drag to reorder */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={lesson.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div>
              {lesson.blocks.map((block: BlockCreate, idx) => (
                <div key={block.id}>
                  <SortableBlock
                    block={block}
                    onUpdateBlock={onUpdateBlock}
                    onConvertBlock={onConvertBlock}
                    onActivate={setActiveEditor}
                    onDuplicate={onDuplicateBlock}
                    onDelete={handleDelete}
                  />
                  {idx < lesson.blocks.length && (
                    <InsertSeparator onAdd={(type) => onAddBlock(type, idx)} />
                  )}
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Always-visible add strip */}
        <AddBlockStrip onAdd={onAddBlock} onOpenHelp={onOpenHelp} />
      </div>

      {/* Undo toast */}
      {undoBlock && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white rounded-2xl pl-4 pr-2 py-2 shadow-2xl">
          <span className="text-sm font-semibold">Блок удалён</span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-colors"
          >
            <Undo2 className="w-4 h-4" /> Отменить
          </button>
        </div>
      )}
    </div>
  );
}
