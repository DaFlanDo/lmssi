import {
  Plus, Trash2, CheckCircle, Circle, CheckSquare, Square,
  ClipboardList, Award, Shuffle, Timer, ListOrdered, ToggleLeft,
  PenLine, List, GripVertical, Eye,
} from 'lucide-react';
import type { ModuleTest, ModuleTestContent, QuizQuestion, QuestionType } from '../../../types';

const genId = () => Math.random().toString(36).substring(2, 11);

// Тип определяется автоматически по иерархии создания — не редактируется.
const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  module: { label: 'Тест модуля',   color: 'bg-brand/10 text-brand border-brand/20' },
  block:  { label: 'Тест блока',    color: 'bg-purple-50 text-purple-600 border-purple-200' },
  final:  { label: 'Итоговый тест', color: 'bg-amber-50 text-amber-600 border-amber-200' },
};

// Типы вопросов для палитры
const QUESTION_TYPES: { type: QuestionType; label: string; Icon: React.ElementType }[] = [
  { type: 'single',   label: 'Один ответ',     Icon: Circle },
  { type: 'multiple', label: 'Несколько',      Icon: CheckSquare },
  { type: 'boolean',  label: 'Верно/неверно',  Icon: ToggleLeft },
  { type: 'short',    label: 'Короткий ответ', Icon: PenLine },
  { type: 'ordering', label: 'Порядок',        Icon: ListOrdered },
];

function parseContent(raw: string): ModuleTestContent {
  try {
    const parsed = JSON.parse(raw);
    return {
      questions: parsed.questions ?? [],
      pass_threshold: parsed.pass_threshold ?? 70,
      questions_per_attempt: parsed.questions_per_attempt ?? 0,
      shuffle_questions: parsed.shuffle_questions ?? false,
      shuffle_options: parsed.shuffle_options ?? false,
      time_limit_min: parsed.time_limit_min ?? 0,
      show_correct_answers: parsed.show_correct_answers ?? true,
    };
  } catch {
    return {
      questions: [], pass_threshold: 70, questions_per_attempt: 0,
      shuffle_questions: false, shuffle_options: false, time_limit_min: 0,
      show_correct_answers: true,
    };
  }
}

const qType = (q: QuizQuestion): QuestionType => q.type ?? 'single';

// Привести форму вопроса к новому типу, не теряя по возможности данные.
function changeType(q: QuizQuestion, type: QuestionType): QuizQuestion {
  if (type === 'boolean') {
    return { ...q, type, options: ['Верно', 'Неверно'], correctIndex: q.correctIndex === 1 ? 1 : 0 };
  }
  if (type === 'short') {
    return { ...q, type, correctText: q.correctText ?? '' };
  }
  const options = q.options.length >= 2 ? q.options : ['', ''];
  if (type === 'multiple') {
    const correctIndices = q.correctIndices?.length ? q.correctIndices : [q.correctIndex ?? 0];
    return { ...q, type, options, correctIndices };
  }
  // single / ordering
  return { ...q, type, options, correctIndex: Math.min(q.correctIndex ?? 0, options.length - 1) };
}

interface QuestionEditorProps {
  question: QuizQuestion;
  index: number;
  onChange: (q: QuizQuestion) => void;
  onDelete: () => void;
}

function QuestionEditor({ question, index, onChange, onDelete }: QuestionEditorProps) {
  const type = qType(question);

  const setOption = (optIdx: number, value: string) => {
    const newOptions = [...question.options];
    newOptions[optIdx] = value;
    onChange({ ...question, options: newOptions });
  };

  const removeOption = (optIdx: number) => {
    const newOptions = question.options.filter((_, i) => i !== optIdx);
    const fixIdx = (i: number) => (i === optIdx ? 0 : i > optIdx ? i - 1 : i);
    onChange({
      ...question,
      options: newOptions,
      correctIndex: fixIdx(question.correctIndex),
      correctIndices: question.correctIndices?.filter((i) => i !== optIdx).map(fixIdx),
    });
  };

  const moveOption = (optIdx: number, dir: -1 | 1) => {
    const target = optIdx + dir;
    if (target < 0 || target >= question.options.length) return;
    const newOptions = [...question.options];
    [newOptions[optIdx], newOptions[target]] = [newOptions[target], newOptions[optIdx]];
    onChange({ ...question, options: newOptions });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 group/q hover:border-brand/30 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <span className="shrink-0 w-7 h-7 rounded-full bg-brand/10 text-brand text-xs font-black flex items-center justify-center mt-0.5">
          {index + 1}
        </span>
        <textarea
          value={question.question}
          onChange={(e) => onChange({ ...question, question: e.target.value })}
          placeholder="Текст вопроса..."
          rows={2}
          className="flex-1 resize-none text-slate-800 font-semibold text-base bg-transparent border-none outline-none placeholder-slate-300"
        />
        <button
          onClick={onDelete}
          className="opacity-0 group-hover/q:opacity-100 w-7 h-7 rounded-xl hover:bg-red-50 hover:text-red-500 text-slate-300 flex items-center justify-center transition-all shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Type selector */}
      <div className="flex flex-wrap gap-1.5 ml-10 mb-4">
        {QUESTION_TYPES.map(({ type: t, label, Icon }) => {
          const active = type === t;
          return (
            <button
              key={t}
              onClick={() => onChange(changeType(question, t))}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                active
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : 'bg-white text-slate-400 border-slate-200 hover:border-brand/40 hover:text-brand'
              }`}
            >
              <Icon className="w-3 h-3" /> {label}
            </button>
          );
        })}
      </div>

      {/* ── Per-type editor ── */}
      <div className="space-y-2 ml-10">

        {/* single / boolean — radio */}
        {(type === 'single' || type === 'boolean') && question.options.map((opt, optIdx) => {
          const isCorrect = question.correctIndex === optIdx;
          return (
            <div key={optIdx} className="flex items-center gap-2.5 group/opt">
              <button
                onClick={() => onChange({ ...question, correctIndex: optIdx })}
                className={`shrink-0 w-5 h-5 rounded-full transition-all flex items-center justify-center ${
                  isCorrect ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'
                }`}
                title="Правильный ответ"
              >
                {isCorrect ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </button>
              <input
                type="text"
                value={opt}
                disabled={type === 'boolean'}
                onChange={(e) => setOption(optIdx, e.target.value)}
                placeholder={`Вариант ${optIdx + 1}...`}
                className={`flex-1 text-sm font-medium bg-transparent border-none outline-none placeholder-slate-300 disabled:cursor-default ${
                  isCorrect ? 'text-emerald-600' : 'text-slate-600'
                }`}
              />
              {type === 'single' && question.options.length > 2 && (
                <button
                  onClick={() => removeOption(optIdx)}
                  className="opacity-0 group-hover/opt:opacity-100 w-5 h-5 rounded-lg hover:bg-red-50 hover:text-red-400 text-slate-200 flex items-center justify-center transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* multiple — checkboxes */}
        {type === 'multiple' && question.options.map((opt, optIdx) => {
          const checked = question.correctIndices?.includes(optIdx) ?? false;
          return (
            <div key={optIdx} className="flex items-center gap-2.5 group/opt">
              <button
                onClick={() => {
                  const cur = new Set(question.correctIndices ?? []);
                  if (cur.has(optIdx)) cur.delete(optIdx); else cur.add(optIdx);
                  onChange({ ...question, correctIndices: [...cur].sort((a, b) => a - b) });
                }}
                className={`shrink-0 w-5 h-5 rounded-md transition-all flex items-center justify-center ${
                  checked ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'
                }`}
                title="Отметьте все верные"
              >
                {checked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
              </button>
              <input
                type="text"
                value={opt}
                onChange={(e) => setOption(optIdx, e.target.value)}
                placeholder={`Вариант ${optIdx + 1}...`}
                className={`flex-1 text-sm font-medium bg-transparent border-none outline-none placeholder-slate-300 ${
                  checked ? 'text-emerald-600' : 'text-slate-600'
                }`}
              />
              {question.options.length > 2 && (
                <button
                  onClick={() => removeOption(optIdx)}
                  className="opacity-0 group-hover/opt:opacity-100 w-5 h-5 rounded-lg hover:bg-red-50 hover:text-red-400 text-slate-200 flex items-center justify-center transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* ordering — list with up/down, order = correct */}
        {type === 'ordering' && (
          <>
            <p className="text-[11px] text-slate-400 font-semibold mb-1">
              Расположите шаги в правильном порядке — студент увидит их перемешанными.
            </p>
            {question.options.map((opt, optIdx) => (
              <div key={optIdx} className="flex items-center gap-2 group/opt">
                <span className="shrink-0 w-5 h-5 rounded-md bg-brand/10 text-brand text-[11px] font-black flex items-center justify-center">
                  {optIdx + 1}
                </span>
                <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => setOption(optIdx, e.target.value)}
                  placeholder={`Шаг ${optIdx + 1}...`}
                  className="flex-1 text-sm font-medium bg-transparent border-none outline-none placeholder-slate-300 text-slate-600"
                />
                <div className="flex items-center opacity-0 group-hover/opt:opacity-100 transition-all">
                  <button onClick={() => moveOption(optIdx, -1)} disabled={optIdx === 0}
                    className="w-5 h-5 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-20 text-xs">↑</button>
                  <button onClick={() => moveOption(optIdx, 1)} disabled={optIdx === question.options.length - 1}
                    className="w-5 h-5 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-20 text-xs">↓</button>
                  {question.options.length > 2 && (
                    <button onClick={() => removeOption(optIdx)}
                      className="w-5 h-5 rounded-lg hover:bg-red-50 hover:text-red-400 text-slate-200 flex items-center justify-center">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* short — accepted answers */}
        {type === 'short' && (
          <div>
            <input
              type="text"
              value={question.correctText ?? ''}
              onChange={(e) => onChange({ ...question, correctText: e.target.value })}
              placeholder="Правильный ответ (несколько вариантов — через «|»)"
              className="w-full text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand/40 placeholder-slate-300 text-emerald-600"
            />
            <p className="text-[11px] text-slate-400 font-medium mt-1.5">
              Сравнение без учёта регистра, пробелов и «ё/е». Пример: <span className="font-mono">120|сто двадцать</span>
            </p>
          </div>
        )}

        {/* Add option (not for boolean/short) */}
        {(type === 'single' || type === 'multiple' || type === 'ordering') && question.options.length < 8 && (
          <button
            onClick={() => onChange({ ...question, options: [...question.options, ''] })}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-brand transition-colors ml-7 mt-1"
          >
            <Plus className="w-3 h-3" /> Добавить {type === 'ordering' ? 'шаг' : 'вариант'}
          </button>
        )}
      </div>
    </div>
  );
}

interface Props {
  test: ModuleTest;
  onChange: (updated: ModuleTest) => void;
}

export function ModuleTestEditor({ test, onChange }: Props) {
  const data = parseContent(test.content);
  const typeInfo = TYPE_LABEL[test.type] ?? TYPE_LABEL.module;

  const update = (patch: Partial<ModuleTestContent>) => {
    onChange({ ...test, content: JSON.stringify({ ...data, ...patch }) });
  };

  const updateQuestion = (idx: number, q: QuizQuestion) => {
    update({ questions: data.questions.map((old, i) => (i === idx ? q : old)) });
  };

  const addQuestion = () => {
    const q: QuizQuestion = {
      id: genId(), type: 'single', question: '',
      options: ['', '', '', ''], correctIndex: 0,
    };
    update({ questions: [...data.questions, q] });
  };

  const deleteQuestion = (idx: number) => {
    update({ questions: data.questions.filter((_, i) => i !== idx) });
  };

  return (
    <div className="bento-card bg-white/90 backdrop-blur-xl flex flex-col h-full overflow-hidden">

      {/* Pinned header */}
      <div className="shrink-0 border-b border-slate-100 px-6 py-3 flex items-center gap-3 rounded-t-[28px] bg-slate-50/80">
        <ClipboardList className="w-4 h-4 text-brand" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Редактор теста</span>
        <span className={`ml-auto text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${typeInfo.color}`}>
          {typeInfo.label}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-8 pb-16 space-y-6">

        {/* Test title */}
        <textarea
          value={test.title}
          onChange={(e) => onChange({ ...test, title: e.target.value })}
          placeholder="Название теста"
          rows={1}
          className="w-full resize-none text-4xl font-black text-slate-900 leading-tight bg-transparent border-none outline-none placeholder-slate-200"
        />

        {/* Cert-impact note */}
        {(test.type === 'module' || test.type === 'final') && (
          <div className="flex items-start gap-2.5 rounded-2xl px-4 py-3 bg-brand/5 border border-brand/15">
            <Award className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <p className="text-[13px] font-medium text-slate-600 leading-snug">
              Обязательный тест: студент должен набрать порог, чтобы получить сертификат.
              Это не самопроверка — результат засчитывается.
            </p>
          </div>
        )}

        {/* ── Test settings ── */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Настройки теста</p>

          {/* Pass threshold */}
          <div className="flex items-center gap-4">
            <p className="text-xs font-bold text-slate-500 w-40 shrink-0">Порог прохождения</p>
            <input
              type="range" min={0} max={100} step={5}
              value={data.pass_threshold}
              onChange={(e) => update({ pass_threshold: Number(e.target.value) })}
              className="flex-1 accent-brand"
            />
            <span className="text-sm font-black text-brand w-10 text-right">{data.pass_threshold}%</span>
          </div>

          {/* Questions per attempt (bank) */}
          <div className="flex items-center gap-4">
            <p className="text-xs font-bold text-slate-500 w-40 shrink-0 flex items-center gap-1.5">
              <List className="w-3.5 h-3.5 text-slate-400" /> Вопросов в попытке
            </p>
            <input
              type="number" min={0} max={data.questions.length}
              value={data.questions_per_attempt || 0}
              onChange={(e) => update({ questions_per_attempt: Math.max(0, Math.min(Number(e.target.value), data.questions.length)) })}
              className="w-20 text-sm font-bold bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-brand/40 text-slate-700"
            />
            <span className="text-[11px] text-slate-400 font-medium">
              0 = все ({data.questions.length}). Иначе — случайная выборка из банка.
            </span>
          </div>

          {/* Time limit */}
          <div className="flex items-center gap-4">
            <p className="text-xs font-bold text-slate-500 w-40 shrink-0 flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-slate-400" /> Лимит времени, мин
            </p>
            <input
              type="number" min={0} max={240}
              value={data.time_limit_min || 0}
              onChange={(e) => update({ time_limit_min: Math.max(0, Number(e.target.value)) })}
              className="w-20 text-sm font-bold bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-brand/40 text-slate-700"
            />
            <span className="text-[11px] text-slate-400 font-medium">0 = без ограничения. По истечении — автосдача.</span>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-2 pt-1">
            {([
              { key: 'shuffle_questions', label: 'Перемешивать вопросы', Icon: Shuffle, val: data.shuffle_questions },
              { key: 'shuffle_options', label: 'Перемешивать варианты', Icon: Shuffle, val: data.shuffle_options },
              { key: 'show_correct_answers', label: 'Показывать разбор', Icon: Eye, val: data.show_correct_answers },
            ] as const).map(({ key, label, Icon, val }) => (
              <button
                key={key}
                onClick={() => update({ [key]: !val } as Partial<ModuleTestContent>)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                  val
                    ? 'bg-brand text-white border-brand shadow-sm'
                    : 'bg-white text-slate-400 border-slate-200 hover:border-brand/40'
                }`}
              >
                <Icon className="w-3 h-3" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Questions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Вопросы <span className="text-brand">({data.questions.length})</span>
            </p>
          </div>

          {data.questions.length === 0 && (
            <div className="text-center py-10 text-slate-300 font-medium italic">
              Нажмите «Добавить вопрос» чтобы начать
            </div>
          )}

          <div className="space-y-3">
            {data.questions.map((q, idx) => (
              <QuestionEditor
                key={q.id}
                question={q}
                index={idx}
                onChange={(updated) => updateQuestion(idx, updated)}
                onDelete={() => deleteQuestion(idx)}
              />
            ))}
          </div>

          <button
            onClick={addQuestion}
            className="mt-4 flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-brand/50 hover:text-brand font-semibold text-sm transition-all w-full justify-center"
          >
            <Plus className="w-4 h-4" /> Добавить вопрос
          </button>
        </div>
      </div>
    </div>
  );
}
