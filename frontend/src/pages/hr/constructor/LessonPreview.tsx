import { PlayCircle, FileText, ClipboardList, Trophy, CheckSquare, PenLine, Sparkles, CheckCircle2 } from 'lucide-react';
import type { LessonCreate, BlockCreate, ModuleTest, QuizQuestion } from '../../../types';
import { CalloutView } from './blocks/CalloutBlock';
import { ChecklistView } from './blocks/ChecklistBlock';

// ── Media (mirror of StudentCourse MediaBlock, read-only) ──────────────────────
function PreviewMedia({ url }: { url: string }) {
  if (!url) {
    return (
      <div className="my-6 p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center h-[220px]">
        <PlayCircle className="w-12 h-12 text-slate-300" />
      </div>
    );
  }
  if (url.includes('youtu')) {
    const vidId = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();
    return <iframe className="w-full aspect-video rounded-2xl mt-6 shadow-md" src={`https://www.youtube.com/embed/${vidId}`} allowFullScreen />;
  }
  if (url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i))
    return <img src={url} alt="Media" className="w-full rounded-2xl mt-6 max-h-[400px] object-cover shadow-md" />;
  if (url.match(/\.(mp4|webm|ogg)$/i))
    return <video src={url} controls className="w-full rounded-2xl mt-6 aspect-video shadow-md bg-black" />;
  return (
    <div className="my-6 p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center h-[220px]">
      <PlayCircle className="w-12 h-12 text-slate-300" />
    </div>
  );
}

// ── Static quiz preview ────────────────────────────────────────────────────────
function PreviewQuiz({ content }: { content: string }) {
  let quiz: { question: string; options: string[]; correctIndex: number } = { question: '', options: [], correctIndex: 0 };
  try { if (content) quiz = JSON.parse(content); } catch { /* defaults */ }
  return (
    <div className="my-6 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
      <h4 className="text-emerald-800 font-bold mb-3 flex items-center gap-2 text-sm">
        <CheckSquare className="w-4 h-4" /> Проверка знаний
      </h4>
      <p className="text-emerald-900 font-black text-lg mb-4">{quiz.question || 'Вопрос не задан'}</p>
      <div className="space-y-2">
        {quiz.options.filter((o) => o).map((opt, i) => (
          <div
            key={i}
            className={`px-4 py-3 rounded-xl border-2 font-semibold text-sm flex items-center gap-2 ${
              i === quiz.correctIndex ? 'bg-white border-emerald-300 text-emerald-800' : 'bg-white border-emerald-100 text-emerald-900'
            }`}
          >
            {i === quiz.correctIndex && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            {opt}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-emerald-600/70 font-semibold mt-3">✓ правильный ответ (виден только в превью)</p>
    </div>
  );
}

// ── Static open-answer preview ─────────────────────────────────────────────────
function PreviewOpenAnswer({ content }: { content: string }) {
  let data: { prompt: string; criteria: string } = { prompt: '', criteria: '' };
  try { if (content) data = JSON.parse(content); } catch { /* defaults */ }
  return (
    <div className="my-6 p-6 rounded-2xl border border-amber-200 bg-amber-50/60">
      <h4 className="text-amber-800 font-bold mb-2 flex items-center gap-2 text-sm">
        <PenLine className="w-4 h-4" /> Открытый ответ
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
          <Sparkles className="w-3 h-3" /> ИИ-проверка
        </span>
      </h4>
      <p className="text-amber-900 font-black text-lg mb-4">{data.prompt || 'Раскройте тему урока своими словами.'}</p>
      <div className="w-full h-24 rounded-xl border-2 border-amber-200 bg-white/70 flex items-center justify-center text-slate-300 font-medium text-sm">
        Поле для развёрнутого ответа сотрудника
      </div>
    </div>
  );
}

function PreviewBlock({ block }: { block: BlockCreate }) {
  switch (block.type) {
    case 'text':
      return block.content
        ? <div className="prose-editor max-w-none" dangerouslySetInnerHTML={{ __html: block.content }} />
        : <p className="text-slate-300 italic">Пустой текстовый блок</p>;
    case 'video':       return <PreviewMedia url={block.content} />;
    case 'quiz':        return <PreviewQuiz content={block.content} />;
    case 'callout':     return <CalloutView content={block.content} />;
    case 'checklist':   return <ChecklistView content={block.content} />;
    case 'open_answer': return <PreviewOpenAnswer content={block.content} />;
    default:            return null;
  }
}

// ── Test preview ───────────────────────────────────────────────────────────────
const Q_TYPE_LABEL: Record<string, string> = {
  single: 'Один ответ', multiple: 'Несколько ответов', boolean: 'Верно / неверно',
  short: 'Короткий ответ', ordering: 'Порядок',
};

function TestPreview({ test }: { test: ModuleTest }) {
  let data: { questions: QuizQuestion[]; pass_threshold: number } = { questions: [], pass_threshold: 70 };
  try { if (test.content) data = JSON.parse(test.content); } catch { /* defaults */ }
  const isFinal = test.type === 'final';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${isFinal ? 'bg-amber-500' : 'bg-emerald-500'}`}>
          {isFinal ? <Trophy className="w-6 h-6" /> : <ClipboardList className="w-6 h-6" />}
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900">{test.title || (isFinal ? 'Итоговый тест' : 'Тест модуля')}</h2>
          <p className="text-sm text-slate-400 font-medium">
            {data.questions.length} вопрос(ов) · порог {data.pass_threshold}%
          </p>
        </div>
      </div>

      {data.questions.length === 0 ? (
        <p className="text-slate-300 italic">В тесте пока нет вопросов</p>
      ) : (
        <div className="space-y-5">
          {data.questions.map((q, qi) => {
            const type = q.type ?? 'single';
            const correctSet = type === 'multiple'
              ? new Set((q.correctIndices ?? []).map(Number))
              : new Set([Number(q.correctIndex)]);
            return (
              <div key={q.id || qi} className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Вопрос {qi + 1}</p>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">{Q_TYPE_LABEL[type]}</span>
                </div>
                <p className="text-slate-800 font-bold text-lg mb-4">{q.question || '—'}</p>

                {type === 'short' ? (
                  <div className="px-4 py-2.5 rounded-xl text-sm font-medium border bg-emerald-50 border-emerald-200 text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {(q.correctText ?? '').split('|').map((x) => x.trim()).filter(Boolean).join(', ') || '—'}
                  </div>
                ) : type === 'ordering' ? (
                  <div className="space-y-2">
                    {q.options.filter((o) => o).map((opt, oi) => (
                      <div key={oi} className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 border bg-slate-50 border-slate-100 text-slate-700">
                        <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-600 text-[11px] font-black flex items-center justify-center">{oi + 1}</span>
                        {opt}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {q.options.filter((o) => o).map((opt, oi) => (
                      <div
                        key={oi}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 border ${
                          correctSet.has(oi) ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-600'
                        }`}
                      >
                        {correctSet.has(oi) && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <p className="text-[11px] text-slate-400 font-semibold">✓ правильные ответы видны только в превью</p>
        </div>
      )}
    </div>
  );
}

interface Props {
  lesson?: LessonCreate;
  test?: ModuleTest;
}

export function LessonPreview({ lesson, test }: Props) {
  if (test) return <TestPreview test={test} />;

  if (lesson) {
    return (
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px] uppercase tracking-widest mb-4">
          {lesson.type === 'video' ? <PlayCircle className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />} Материал
        </div>
        <h2 className="text-3xl font-black text-slate-900 leading-tight mb-8">{lesson.title || 'Без названия'}</h2>
        <div className="space-y-2">
          {lesson.blocks.length === 0 ? (
            <p className="text-slate-300 italic">В уроке пока нет контента</p>
          ) : (
            lesson.blocks.map((b) => <PreviewBlock key={b.id} block={b} />)
          )}
        </div>
      </div>
    );
  }

  return <p className="text-slate-400 text-center py-10">Выберите урок или тест для предпросмотра</p>;
}
