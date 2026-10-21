import { Plus, Trash2, GripVertical, CheckSquare } from 'lucide-react';
import { useState } from 'react';

interface ChecklistData {
  items: string[];
}

interface Props {
  content: string;
  onChange: (v: string) => void;
}

function parse(content: string): ChecklistData {
  try {
    if (content) return JSON.parse(content);
  } catch { /* keep defaults on malformed JSON */ }
  return { items: [''] };
}

export function ChecklistBlock({ content, onChange }: Props) {
  const data = parse(content);

  const update = (items: string[]) => onChange(JSON.stringify({ items }));

  const setItem = (i: number, val: string) => {
    const next = [...data.items];
    next[i] = val;
    update(next);
  };

  const addItem = (after: number) => {
    const next = [...data.items];
    next.splice(after + 1, 0, '');
    update(next);
  };

  const removeItem = (i: number) => {
    if (data.items.length === 1) { update(['']); return; }
    update(data.items.filter((_, idx) => idx !== i));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem(i); }
    if (e.key === 'Backspace' && data.items[i] === '' && data.items.length > 1) {
      e.preventDefault();
      removeItem(i);
    }
  };

  return (
    <div
      className="rounded-2xl p-5 my-2"
      style={{ background: 'rgba(37,99,235,0.04)', border: '1.5px solid rgba(37,99,235,0.12)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(37,99,235,0.1)' }}
        >
          <CheckSquare className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
        </div>
        <span className="text-[10px] font-black text-brand uppercase tracking-widest">Чеклист</span>
        <span className="text-[10px] text-slate-300 font-medium ml-1">· студент отмечает пункты</span>
      </div>

      <div className="space-y-1.5">
        {data.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 group/item">
            <GripVertical className="w-3.5 h-3.5 text-slate-200 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity cursor-grab" />
            <div
              className="w-4.5 h-4.5 rounded border-2 shrink-0"
              style={{ width: 18, height: 18, borderColor: 'rgba(37,99,235,0.3)', background: 'white', borderRadius: 5 }}
            />
            <input
              type="text"
              value={item}
              autoFocus={i === data.items.length - 1 && item === '' && data.items.length > 1}
              onChange={(e) => setItem(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              placeholder={`Пункт ${i + 1}...`}
              className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-700 placeholder-slate-300"
            />
            <button
              onClick={() => removeItem(i)}
              className="opacity-0 group-hover/item:opacity-100 p-1 rounded-lg hover:bg-red-100 hover:text-red-500 text-slate-300 transition-all shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => addItem(data.items.length - 1)}
        className="flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
        style={{ color: '#2563eb', background: 'rgba(37,99,235,0.07)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.13)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.07)')}
      >
        <Plus className="w-3.5 h-3.5" /> Добавить пункт
      </button>
    </div>
  );
}

// Read-only interactive view for StudentCourse
export function ChecklistView({ content }: { content: string }) {
  const data = parse(content);
  const nonEmpty = data.items.filter((s) => s.trim());
  const [checked, setChecked] = useState<boolean[]>(nonEmpty.map(() => false));

  if (nonEmpty.length === 0) return null;

  const toggle = (i: number) =>
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  const doneCount = checked.filter(Boolean).length;

  return (
    <div
      className="rounded-2xl p-5 my-2"
      style={{ background: 'rgba(37,99,235,0.04)', border: '1.5px solid rgba(37,99,235,0.12)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.1)' }}>
            <CheckSquare className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />
          </div>
          <span className="text-[10px] font-black text-brand uppercase tracking-widest">Чеклист</span>
        </div>
        <span className="text-[10px] font-bold text-slate-400">
          {doneCount}/{nonEmpty.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-slate-100 mb-4 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${nonEmpty.length > 0 ? (doneCount / nonEmpty.length) * 100 : 0}%`,
            background: doneCount === nonEmpty.length ? '#059669' : '#2563eb',
          }}
        />
      </div>

      <div className="space-y-2">
        {nonEmpty.map((item, i) => (
          <label
            key={i}
            className="flex items-start gap-3 cursor-pointer group/check rounded-xl px-2 py-1.5 transition-colors hover:bg-white/60"
          >
            <div className="shrink-0 mt-0.5">
              <div
                className="w-[18px] h-[18px] rounded-[5px] border-2 flex items-center justify-center transition-all"
                style={{
                  borderColor: checked[i] ? '#2563eb' : 'rgba(37,99,235,0.3)',
                  background: checked[i] ? '#2563eb' : 'white',
                }}
                onClick={() => toggle(i)}
              >
                {checked[i] && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span
              className="text-sm font-medium leading-snug transition-colors"
              style={{ color: checked[i] ? '#94a3b8' : '#334155', textDecoration: checked[i] ? 'line-through' : 'none' }}
              onClick={() => toggle(i)}
            >
              {item}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
