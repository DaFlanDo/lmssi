import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  emptyText?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Выберите...',
  searchable = true,
  emptyText = 'Ничего не найдено',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase())
        || (o.description?.toLowerCase().includes(query.toLowerCase()) ?? false)
      )
    : options;

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border bg-white font-medium text-left transition-all outline-none ${
          open
            ? 'border-brand ring-4 ring-brand/10 shadow-sm'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className={`truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl shadow-slate-300/40 border border-slate-100 overflow-hidden"
          >
            {searchable && options.length > 5 && (
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    autoFocus
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 text-sm font-medium text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
            )}

            <div className="max-h-72 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-slate-400 font-medium">
                  {emptyText}
                </div>
              ) : (
                filtered.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => {
                        if (opt.disabled) return;
                        onChange(opt.value);
                        setOpen(false);
                        setQuery('');
                      }}
                      title={opt.disabled ? opt.disabledReason : undefined}
                      className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        opt.disabled
                          ? 'opacity-50 cursor-not-allowed'
                          : isSelected
                            ? 'bg-brand/10'
                            : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm truncate ${isSelected ? 'font-bold text-brand' : 'font-semibold text-slate-700'}`}>
                          {opt.label}
                        </div>
                        {(opt.description || opt.disabledReason) && (
                          <div className="text-xs text-slate-400 font-medium truncate mt-0.5">
                            {opt.disabled ? opt.disabledReason : opt.description}
                          </div>
                        )}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-brand shrink-0 mt-1" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}