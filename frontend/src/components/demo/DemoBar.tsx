import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { DEMO_ROLES, type DemoRole } from '../../lib/demo';

/** Плашка внизу экрана под демо-аккаунтом: переключение роли в один клик. */
export function DemoBar() {
  const { user, isDemoUser, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  if (!isDemoUser || !user) return null;

  const switchTo = async (role: DemoRole) => {
    if (role === user.role || pending) return;
    setPending(true);
    try {
      await demoLogin(role);
      navigate('/', { replace: true });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 print:hidden">
      <div className="flex items-center gap-1 p-1 pl-4 rounded-full bg-slate-900/90 backdrop-blur text-white shadow-2xl">
        <span className="hidden sm:inline text-xs font-bold text-white/60 mr-2 whitespace-nowrap">Демо · роль</span>
        {DEMO_ROLES.map(({ role, title }) => (
          <button
            key={role}
            type="button"
            disabled={pending}
            onClick={() => switchTo(role)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              role === user.role ? 'bg-white text-slate-900' : 'text-white/80 hover:bg-white/15'
            }`}
          >
            {title}
          </button>
        ))}
      </div>
    </div>
  );
}
