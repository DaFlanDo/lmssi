import { FileText, PlayCircle } from 'lucide-react';
import type { LessonRead } from '../../../types';
import { CalloutView } from '../../hr/constructor/blocks/CalloutBlock';
import { ChecklistView } from '../../hr/constructor/blocks/ChecklistBlock';
import { OpenAnswerView } from '../../hr/constructor/blocks/OpenAnswerBlock';
import { InteractiveQuiz } from './InteractiveQuiz';
import { MediaBlock } from './MediaBlock';
import { isPlayableVideo } from './video';

// ── Заголовок урока и его блоки (текст, видео, квизы, открытые вопросы…) ─────
export function LessonContent({ lesson, requireVideo, onVideoWatch, onQuizComplete }: {
  lesson: LessonRead;
  requireVideo: boolean;
  onVideoWatch: (blockId: string, frac: number) => void;
  onQuizComplete: () => void;
}) {
  return (
    <>
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-widest mb-6">
          {lesson.type === 'video' ? <PlayCircle className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />} Материал
        </div>
        <h2 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight mb-4">
          {lesson.title}
        </h2>
      </div>

      <div className="space-y-6 mb-12">
        {lesson.blocks.map((block) => (
          <div key={block.id}>
            {block.type === 'text' && (
              <div className="prose-editor max-w-none" dangerouslySetInnerHTML={{ __html: block.content }} />
            )}
            {block.type === 'video' && (
              <MediaBlock
                block={block}
                onWatch={requireVideo && isPlayableVideo(block.content)
                  ? (frac) => onVideoWatch(block.id, frac) : undefined}
              />
            )}
            {block.type === 'quiz' && (
              <InteractiveQuiz block={block} lessonId={lesson.id} onComplete={onQuizComplete} />
            )}
            {block.type === 'callout'   && <CalloutView   content={block.content} />}
            {block.type === 'checklist' && <ChecklistView content={block.content} />}
            {block.type === 'open_answer' && <OpenAnswerView block={block} lessonId={lesson.id} />}
          </div>
        ))}
        {lesson.blocks.length === 0 && (
          <p className="text-slate-400 italic">Урок пуст. Контент ещё не добавлен.</p>
        )}
      </div>
    </>
  );
}
