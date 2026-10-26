import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthHeroPanel } from '../../components/auth/AuthHeroPanel';
import { DemoAccess } from '../../components/demo/DemoAccess';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <AuthHeroPanel />

      {/* Right panel — form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-1 flex items-center justify-center p-8 bg-slate-50"
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl text-slate-800">LMSSI</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl font-black text-slate-800 mb-2">Добро пожаловать</h2>
            <p className="text-slate-500 font-medium mb-8">
              Войдите, чтобы продолжить обучение
            </p>
          </motion.div>

          <DemoAccess />

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ivan.ivanov@example.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-medium text-slate-700 transition-all"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-sm font-bold text-slate-700 mb-2">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-medium text-slate-700 transition-all"
                />
              </div>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-2xl p-4 text-sm font-bold"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-brand text-white rounded-2xl font-black text-base shadow-xl shadow-brand/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:translate-y-0"
            >
              {loading ? 'Входим...' : 'Войти'}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </motion.button>
          </form>

          <p className="text-center text-sm text-slate-500 font-medium mt-8">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-brand font-bold hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
