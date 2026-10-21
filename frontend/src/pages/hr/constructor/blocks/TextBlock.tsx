import { useEffect, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Link as LinkIcon,
} from 'lucide-react';
import { BLOCK_TYPES } from '../blockTypes';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Вызывается при выборе типа в slash-меню — конвертирует блок (см. CourseConstructor) */
  onSlashCommand?: (type: string) => void;
  /** Регистрирует редактор как активный (для статической панели форматирования) */
  onActivate?: (editor: Editor) => void;
}

function BubbleBtn({
  active, onClick, title, children,
}: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
        active ? 'bg-white text-brand shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-white/15 mx-0.5 shrink-0" />;
}

export function TextBlock({ value, onChange, placeholder = 'Начните писать или нажмите «/»…', onSlashCommand, onActivate }: Props) {
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, HTMLAttributes: { class: 'text-brand underline' } },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onFocus: ({ editor }) => onActivate?.(editor),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      // Slash-триггер: одиночный параграф вида "/" или "/запрос"
      const text = editor.getText();
      const m = text.match(/^\/(\p{L}*)$/u);
      if (m && onSlashCommand) {
        setSlashQuery(m[1].toLowerCase());
        setSlashOpen(true);
      } else if (slashOpen) {
        setSlashOpen(false);
      }
    },
    editorProps: {
      attributes: { class: 'prose-editor outline-none min-h-[40px] w-full py-2' },
    },
  });

  // Синхронизация внешнего значения (переключение урока / undo) без сброса курсора
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  const pickSlash = (type: string) => {
    setSlashOpen(false);
    editor?.commands.clearContent();
    onChange('');
    if (type !== 'text' && onSlashCommand) {
      onSlashCommand(type);
    } else {
      editor?.commands.focus();
    }
  };

  const slashOptions = BLOCK_TYPES.filter(
    (b) => !slashQuery || b.label.toLowerCase().includes(slashQuery) || b.hint.toLowerCase().includes(slashQuery),
  );

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Ссылка (URL):', prev || 'https://');
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="relative">
      <BubbleMenu
        editor={editor}
        className="flex items-center gap-0.5 bg-slate-900 rounded-xl px-1.5 py-1 shadow-2xl border border-white/10"
      >
        <BubbleBtn title="Заголовок 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="w-4 h-4" /></BubbleBtn>
        <BubbleBtn title="Заголовок 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="w-4 h-4" /></BubbleBtn>
        <BubbleBtn title="Заголовок 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="w-4 h-4" /></BubbleBtn>
        <Sep />
        <BubbleBtn title="Жирный" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></BubbleBtn>
        <BubbleBtn title="Курсив" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></BubbleBtn>
        <BubbleBtn title="Подчёркнутый" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-4 h-4" /></BubbleBtn>
        <BubbleBtn title="Зачёркнутый" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="w-4 h-4" /></BubbleBtn>
        <BubbleBtn title="Код" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="w-4 h-4" /></BubbleBtn>
        <Sep />
        <BubbleBtn title="Маркированный список" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></BubbleBtn>
        <BubbleBtn title="Нумерованный список" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></BubbleBtn>
        <BubbleBtn title="Цитата" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="w-4 h-4" /></BubbleBtn>
        <BubbleBtn title="Ссылка" active={editor.isActive('link')} onClick={setLink}><LinkIcon className="w-4 h-4" /></BubbleBtn>
      </BubbleMenu>

      <EditorContent editor={editor} />

      {/* Slash-меню */}
      {slashOpen && onSlashCommand && (
        <div className="absolute left-0 top-full mt-1 z-40 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 overflow-hidden">
          <div className="px-3 pb-1.5 text-[10px] font-black text-slate-300 uppercase tracking-widest">Вставить блок</div>
          {slashOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-400 font-medium">Ничего не найдено</div>
          ) : (
            slashOptions.map(({ type, label, Icon, hint }) => (
              <button
                key={type}
                onMouseDown={(e) => { e.preventDefault(); pickSlash(type); }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-700">{label}</div>
                  <div className="text-[11px] text-slate-400 font-medium truncate">{hint}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
