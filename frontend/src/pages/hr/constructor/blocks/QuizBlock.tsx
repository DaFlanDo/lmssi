import { CheckSquare, Plus } from 'lucide-react';

interface QuizData {
  question: string;
  options: string[];
  correctIndex: number;
}

interface Props {
  content: string;
  onChange: (v: string) => void;
}

export function QuizBlock({ content, onChange }: Props) {
  let quiz: QuizData = { question: '', options: [''], correctIndex: 0 };
  try { if (content) quiz = JSON.parse(content); } catch { /* keep defaults on malformed JSON */ }

  const update = (data: QuizData) => onChange(JSON.stringify(data));

  return (
    <div className="w-full py-6 px-8 bg-emerald-50/50 rounded-[28px] border border-emerald-100 my-4 shadow-inner relative">
      <div className="absolute -top-3 -right-3 w-20 h-20 bg-emerald-100 rounded-full blur-2xl opacity-50 pointer-events-none" />
      <div className="mb-5 pl-1 relative z-10">
        <div className="flex items-center gap-2 text-emerald-800 font-bold">
          <CheckSquare className="w-5 h-5" /> Проверочный вопрос
        </div>
        <p className="text-[11px] font-semibold text-emerald-600/70 mt-0.5 ml-7">
          Самопроверка внутри урока · не влияет на сертификат
        </p>
      </div>
      <div className="space-y-4 relative z-10">
        <input
          type="text"
          value={quiz.question}
          onChange={(e) => update({ ...quiz, question: e.target.value })}
          placeholder="Задайте вопрос..."
          className="w-full p-4 rounded-xl border border-emerald-200/60 bg-white font-bold text-emerald-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow shadow-sm"
        />
        <div className="pl-2 space-y-2">
          {quiz.options.map((opt: string, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="radio"
                name={`quiz-correct-${content.slice(0, 8)}`}
                checked={quiz.correctIndex === i}
                onChange={() => update({ ...quiz, correctIndex: i })}
                className="w-5 h-5 accent-emerald-500 cursor-pointer"
                title="Отметить как правильный ответ"
              />
              <input
                type="text"
                value={opt}
                onChange={(e) => {
                  const newOpts = [...quiz.options];
                  newOpts[i] = e.target.value;
                  update({ ...quiz, options: newOpts });
                }}
                placeholder={`Вариант ${i + 1}...`}
                className="flex-1 bg-white border border-emerald-100 px-4 py-2 rounded-lg outline-none text-emerald-900 font-medium focus:border-emerald-400"
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => update({ ...quiz, options: [...quiz.options, ''] })}
          className="mt-2 px-4 py-2 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Добавить вариант
        </button>
      </div>
    </div>
  );
}
