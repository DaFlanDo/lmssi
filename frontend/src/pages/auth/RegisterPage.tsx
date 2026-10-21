import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, ArrowRight, AlertCircle, IdCard, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiGet } from '../../lib/api';
import type { Group } from '../../types';
import { ProfessionPicker } from '../../components/ui/ProfessionPicker';
import { AuthHeroPanel } from '../../components/auth/AuthHeroPanel';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [identificationNumber, setIdentificationNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [groupId, setGroupId] = useState<number | undefined>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet<Group[]>('/api/groups/').then(setGroups).catch(() => null);
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Пароли не совпадают');
      return;
    }
    setLoading(true);
    try {
      await register({
        email,
        identification_number: identificationNumber,
        full_name: fullName,
        password,
        group_id: groupId,
      });
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
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
        className="flex-1 flex items-center justify-center p-8 bg-slate-50 overflow-y-auto"
      >
        <div className="w-full max-w-md py-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-4xl font-black text-slate-800 mb-2">Создать аккаунт</h2>
            <p className="text-slate-500 font-medium mb-8">Заполните все поля для регистрации</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">ФИО</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Иванов Иван Иванович"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-medium text-slate-700 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ivan.ivanov@example.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-medium text-slate-700 transition-all"
                />
              </div>
            </div>

            {/* Identification number */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Идентификационный номер РБ</label>
              <div className="relative">
                <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-id"
                  type="text"
                  required
                  value={identificationNumber}
                  onChange={(e) => setIdentificationNumber(e.target.value.toUpperCase())}
                  placeholder="1234567A123PB4"
                  maxLength={14}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-medium text-slate-700 transition-all uppercase"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">14 символов (например: 0101903A001PB1)</p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-medium text-slate-700 transition-all"
                />
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Подтвердите пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-confirm"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Повторите пароль"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none font-medium text-slate-700 transition-all"
                />
              </div>
            </div>

            {/* Specialty */}
            {groups.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Должность <span className="text-slate-400 font-normal">(необязательно)</span>
                </label>
                <ProfessionPicker
                  groups={groups}
                  value={groupId}
                  onChange={setGroupId}
                />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-2xl p-4 text-sm font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              id="reg-submit"
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-brand text-white rounded-2xl font-black text-base shadow-xl shadow-brand/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:translate-y-0"
            >
              {loading ? 'Создаём аккаунт...' : 'Создать аккаунт'}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 font-medium mt-8">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-brand font-bold hover:underline">
              Войти
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
