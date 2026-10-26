import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isDemoRole } from '../../lib/demo';

/**
 * Прямая ссылка на демо: /demo/student, /demo/hr, /demo/admin.
 * Сразу входит под нужной ролью — ею удобно делиться из портфолио и README.
 */
export function DemoEntry() {
  const { role } = useParams();
  const { demoLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (!isDemoRole(role) || started.current) return;
    started.current = true;
    demoLogin(role)
      .then(() => navigate('/', { replace: true }))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Не удалось войти'));
  }, [role, demoLogin, navigate]);

  if (!isDemoRole(role)) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8 text-center">
      {error ? (
        <div>
          <p className="font-bold text-slate-800 mb-2">{error}</p>
          <Link to="/login" className="text-brand font-bold hover:underline">
            На страницу входа
          </Link>
        </div>
      ) : (
        <p className="font-bold text-slate-500">Входим в демо…</p>
      )}
    </div>
  );
}
