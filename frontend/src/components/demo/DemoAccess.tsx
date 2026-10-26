import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Sparkles, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DEMO_ROLES, type DemoRole } from '../../lib/demo';

const ICONS: Record<DemoRole, typeof GraduationCap> = {
  student: GraduationCap,
  hr: Sparkles,
  admin: ShieldCheck,
};

/** Карточки «Войти как …» — показываются только на демо-стенде. */
export function DemoAccess() {
  const { demo, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<DemoRole | null>(null);
  const [error, setError] = useState('');

  if (!demo?.enabled) return null;

  const enter = async (role: DemoRole) => {
    setError('');
    setPending(role);
    try {
      await demoLogin(role);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось войти');
      setPending(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mb-8"
    >
      <p className="text-sm font-bold text-slate-700 mb-1">Демо без регистрации</p>
      <p className="text-sm text-slate-500 font-medium mb-3">
        Выберите роль — войдёте сразу, данные уже заполнены.
      </p>
      <div className="space-y-2">
        {DEMO_ROLES.map(({ role, title, text }) => {
          const Icon = ICONS[role];
          return (
            <button
              key={role}
              type="button"
              disabled={pending !== null}
              onClick={() => enter(role)}
              className="group w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 bg-white text-left hover:border-brand hover:shadow-lg hover:shadow-brand/10 transition-all disabled:opacity-60"
            >
              <div className="w-10 h-10 shrink-0 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-slate-800">{title}</div>
                <div className="text-xs text-slate-500 font-medium leading-snug">{text}</div>
              </div>
              {pending === role ? (
                <Loader2 className="w-5 h-5 text-brand animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors" />
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}
      <div className="flex items-center gap-3 mt-8">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">или по паролю</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
    </motion.div>
  );
}
