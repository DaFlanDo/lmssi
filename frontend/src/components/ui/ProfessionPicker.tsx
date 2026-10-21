import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronDown, X, Check, ArrowLeft } from 'lucide-react';
import type { Group } from '../../types';

interface Props {
  groups: Group[];
  value: number | undefined;
  onChange: (id: number | undefined) => void;
}

export function ProfessionPicker({ groups, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Group | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const departments = groups.filter(g => !g.parent_id);
  const specialtiesOf = (deptId: number) => groups.filter(g => g.parent_id === deptId);
  const selectedGroup = groups.find(g => g.id === value);

  // When opening, pre-select department of current value
  const handleOpen = () => {
    if (selectedGroup?.parent_id) {
      const dept = groups.find(g => g.id === selectedGroup.parent_id);
      setSelectedDept(dept ?? null);
    } else {
      setSelectedDept(null);
    }
    setOpen(true);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectSpecialty = (spec: Group) => {
    onChange(spec.id);
    setOpen(false);
    setSelectedDept(null);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  const currentSpecialties = selectedDept ? specialtiesOf(selectedDept.id) : [];

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={open ? () => setOpen(false) : handleOpen}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all"
        style={{
          border: open ? '1.5px solid #2563eb' : '1.5px solid #e2e8f0',
          background: open ? 'white' : '#f8fafc',
          boxShadow: open ? '0 0 0 4px rgba(37,99,235,0.08)' : 'none',
        }}
      >
        <Building2 className="w-4 h-4 shrink-0" style={{ color: value ? '#2563eb' : '#94a3b8' }} />

        {value && selectedGroup ? (
          <span className="flex-1 font-semibold text-slate-700 text-sm">{selectedGroup.name}</span>
        ) : (
          <span className="flex-1 text-slate-400 font-medium text-sm">Выберите должность</span>
        )}

        <div className="flex items-center gap-1">
          {value && (
            <span
              onClick={clear}
              className="p-1 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </span>
          )}
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </motion.div>
        </div>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute left-0 right-0 top-full mt-2 z-50 overflow-hidden"
            style={{
              background: 'white',
              borderRadius: '20px',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 16px 48px rgba(15,23,42,0.12), 0 4px 16px rgba(37,99,235,0.06)',
            }}
          >
            <AnimatePresence mode="wait">
              {!selectedDept ? (
                /* Step 1 — pick department */
                <motion.div
                  key="depts"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="p-3"
                >
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 pb-2">
                    Выберите отдел
                  </p>
                  <div className="space-y-1">
                    {departments.map(dept => (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => setSelectedDept(dept)}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all group"
                        style={{ border: '1px solid transparent' }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,0.05)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.12)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = '';
                          (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                        }}
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(37,99,235,0.08)' }}
                        >
                          <Building2 className="w-4 h-4" style={{ color: '#2563eb' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-700">{dept.name}</div>
                          <div className="text-xs text-slate-400 font-medium">
                            {specialtiesOf(dept.id).length} должностей
                          </div>
                        </div>
                        <ChevronDown
                          className="w-4 h-4 text-slate-300 group-hover:text-brand transition-colors -rotate-90"
                        />
                      </button>
                    ))}
                  </div>

                  {/* Skip option */}
                  <button
                    type="button"
                    onClick={() => { onChange(undefined); setOpen(false); }}
                    className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 py-2.5 mt-1 transition-colors"
                  >
                    Пропустить — укажу позже
                  </button>
                </motion.div>
              ) : (
                /* Step 2 — pick specialty */
                <motion.div
                  key="specs"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.18 }}
                  className="p-3"
                >
                  {/* Back header */}
                  <button
                    type="button"
                    onClick={() => setSelectedDept(null)}
                    className="flex items-center gap-2 px-2 pb-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {selectedDept.name}
                  </button>

                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 pb-2">
                    Выберите должность
                  </p>

                  {/* Specialty chips */}
                  <div className="flex flex-wrap gap-2 px-1 pb-1">
                    {currentSpecialties.map(spec => {
                      const isSelected = value === spec.id;
                      return (
                        <motion.button
                          key={spec.id}
                          type="button"
                          onClick={() => selectSpecialty(spec)}
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.97 }}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all"
                          style={
                            isSelected
                              ? {
                                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                  color: 'white',
                                  boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
                                }
                              : {
                                  background: 'rgba(37,99,235,0.07)',
                                  color: '#2563eb',
                                  border: '1px solid rgba(37,99,235,0.12)',
                                }
                          }
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          {spec.name}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
