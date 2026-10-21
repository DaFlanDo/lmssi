import { useState } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';
import { apiPost } from '../../../lib/api';

type ChatMessage = { role: 'user' | 'ai'; text: string };

// ── ИИ-наставник по материалу урока ──────────────────────────────────────────
// Родитель монтирует компонент с key={lessonId}, поэтому при смене урока
// история чата сбрасывается сама.
export function LessonAssistant({ lessonId }: { lessonId: string }) {
  const [aiChat, setAiChat] = useState<ChatMessage[]>([
    { role: 'ai', text: 'Готов помочь по этому уроку. Задайте вопрос по материалу.' },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const sendAi = async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
    const newHistory = [...aiChat, { role: 'user' as const, text }];
    setAiChat(newHistory);
    setAiInput('');
    setAiLoading(true);
    try {
      const history = newHistory.slice(1).slice(-8).map((m) => ({
        role: m.role === 'ai' ? ('assistant' as const) : ('user' as const),
        content: m.text,
      }));
      const res = await apiPost<{ reply: string }>('/api/ai/lesson-assistant', {
        lesson_id: lessonId,
        message: text,
        history: history.slice(0, -1),
      });
      setAiChat((prev) => [...prev, { role: 'ai', text: res.reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось получить ответ';
      setAiChat((prev) => [...prev, { role: 'ai', text: `⚠️ ${msg}` }]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="mt-12 mb-8 bg-gradient-to-r from-amber-200/50 to-amber-100/10 p-[2px] rounded-[30px]">
      <div className="bg-white/90 backdrop-blur-md rounded-[28px] p-8 shadow-[0_10px_40px_-10px_rgba(245,158,11,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-500 text-white rounded-[20px] flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-xl">Умный ассистент</h4>
            <p className="text-sm text-slate-500 font-medium">Задайте вопрос по материалу</p>
          </div>
        </div>
        <div className="space-y-4 mb-6 max-h-[240px] overflow-y-auto pr-2 relative z-10 flex flex-col">
          {aiChat.map((msg, idx) => (
            <div
              key={idx}
              className={`max-w-[85%] p-4 rounded-2xl whitespace-pre-wrap ${
                msg.role === 'ai'
                  ? 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-sm self-start'
                  : 'bg-brand text-white rounded-tr-sm self-end shadow-md'
              }`}
            >
              {msg.role === 'ai' && <Sparkles className="w-3 h-3 text-amber-500 mb-1" />}
              <p className="text-[0.95rem] leading-relaxed m-0 font-medium">{msg.text}</p>
            </div>
          ))}
          {aiLoading && (
            <div className="max-w-[85%] p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500 rounded-tl-sm self-start">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>
        <div className="relative z-10 flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:border-amber-400 transition-colors">
          <input
            type="text"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendAi()}
            disabled={aiLoading}
            placeholder="Спросите по теме урока..."
            className="flex-1 bg-transparent px-4 py-3 text-slate-700 outline-none font-medium placeholder-slate-400 disabled:opacity-50"
          />
          <button
            onClick={sendAi}
            disabled={aiLoading || !aiInput.trim()}
            className="w-12 h-12 bg-slate-900 hover:bg-brand text-white rounded-xl flex items-center justify-center transition-colors shadow-md disabled:opacity-50 disabled:hover:bg-slate-900"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
