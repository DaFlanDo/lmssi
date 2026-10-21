import { Type, Video as VideoIcon, CheckSquare, Info, ListChecks, PenLine } from 'lucide-react';

export interface BlockTypeDef {
  type: string;
  label: string;
  Icon: React.ElementType;
  pill: string;       // классы для пилюли в палитре
  hint: string;       // короткое описание для тултипа/slash-меню
  desc: string;       // развёрнутое описание для справки
  formative?: boolean; // проверка знаний, которая НЕ влияет на сертификат
}

// Единый источник типов блоков для палитры добавления, slash-меню и справки.
// Блок 'ai' исключён намеренно — он не рендерится у студента (есть встроенный ассистент урока).
export const BLOCK_TYPES: BlockTypeDef[] = [
  {
    type: 'text', label: 'Текст', Icon: Type,
    pill: 'bg-blue-50 text-brand border-blue-200 hover:bg-blue-100',
    hint: 'Обычный абзац с форматированием',
    desc: 'Основной контент урока: абзацы, заголовки, списки, ссылки. Форматирование — через панель «Формат» сверху или выделением текста.',
  },
  {
    type: 'video', label: 'Медиа', Icon: VideoIcon,
    pill: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
    hint: 'Видео, YouTube или изображение',
    desc: 'Видео с YouTube, загруженный ролик или изображение. Подходит для демонстраций, записей и наглядных материалов.',
  },
  {
    type: 'quiz', label: 'Задание', Icon: CheckSquare,
    pill: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100',
    hint: 'Вопрос для самопроверки внутри урока. Не влияет на сертификат',
    desc: 'Быстрый вопрос с вариантами прямо в уроке — чтобы студент сам себя проверил. Формирующая проверка: результат не идёт в зачёт сертификата.',
    formative: true,
  },
  {
    type: 'callout', label: 'Заметка', Icon: Info,
    pill: 'bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100',
    hint: 'Важно / внимание / совет',
    desc: 'Выделенная плашка «важно», «совет» или «внимание». Помогает не пропустить ключевую мысль или предупреждение.',
  },
  {
    type: 'checklist', label: 'Чеклист', Icon: ListChecks,
    pill: 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100',
    hint: 'Список пунктов с галочками',
    desc: 'Список пунктов с галочками — для шагов процедуры, требований или правил техники безопасности.',
  },
  {
    type: 'open_answer', label: 'Открытый ответ', Icon: PenLine,
    pill: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    hint: 'Развёрнутый ответ с проверкой ИИ. Не влияет на сертификат',
    desc: 'Студент пишет развёрнутый ответ, его оценивает ИИ и даёт обратную связь. Формирующая проверка: на сертификат не влияет.',
    formative: true,
  },
];
