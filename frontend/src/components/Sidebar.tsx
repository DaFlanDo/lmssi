import { Home, BookOpen, Users, LogOut, LayoutGrid, Award, ShieldCheck, Briefcase, FileText, BarChart3, Settings, UserCircle } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';

const adminNav = [
  { icon: Home, label: 'Обзор', path: '/admin' },
  { icon: BarChart3, label: 'Аналитика', path: '/admin/analytics' },
  { icon: Users, label: 'Сотрудники', path: '/admin/users' },
  { icon: Briefcase, label: 'Профессии', path: '/admin/groups' },
  { icon: BookOpen, label: 'Курсы', path: '/hr/courses' },
  { icon: FileText, label: 'Печ. тесты', path: '/hr/print-tests' },
  { icon: Settings, label: 'Настройки', path: '/admin/settings' },
];

const hrNav = [
  { icon: Home, label: 'Дашборд', path: '/hr' },
  { icon: BarChart3, label: 'Аналитика', path: '/hr/analytics' },
  { icon: BookOpen, label: 'Курсы', path: '/hr/courses' },
  { icon: Briefcase, label: 'Профессии', path: '/hr/positions' },
  { icon: Users, label: 'Сотрудники', path: '/hr/users' },
  { icon: FileText, label: 'Печ. тесты', path: '/hr/print-tests' },
];

const studentNav = [
  { icon: LayoutGrid, label: 'Дашборд', path: '/dashboard' },
  { icon: BookOpen, label: 'Каталог', path: '/catalog' },
  { icon: Award, label: 'Сертификаты', path: '/certificates' },
  { icon: UserCircle, label: 'Профиль', path: '/profile' },
];

const roleLabel: Record<string, string> = {
  admin: 'Администратор',
  hr: 'HR-менеджер',
  student: 'Сотрудник',
};

const roleColor: Record<string, { bg: string; text: string; border: string }> = {
  admin: {
    bg: 'rgba(139,92,246,0.1)',
    text: '#7c3aed',
    border: 'rgba(139,92,246,0.18)',
  },
  hr: {
    bg: 'rgba(37,99,235,0.1)',
    text: '#2563eb',
    border: 'rgba(37,99,235,0.18)',
  },
  student: {
    bg: 'rgba(16,185,129,0.08)',
    text: '#059669',
    border: 'rgba(16,185,129,0.15)',
  },
};

export function Sidebar() {
  const { user, logout } = useAuth();
  const { org } = useOrg();
  const role = user?.role ?? 'student';
  const navItems = role === 'admin' ? adminNav : role === 'hr' ? hrNav : studentNav;
  const badge = roleColor[role] ?? roleColor.student;

  return (
    <aside
      className="w-20 lg:w-64 hidden md:flex flex-col z-20 shrink-0"
      style={{
        background: 'rgba(255, 255, 255, 0.62)',
        backdropFilter: 'blur(28px) saturate(200%)',
        WebkitBackdropFilter: 'blur(28px) saturate(200%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.75)',
        boxShadow: '6px 0 32px rgba(37, 99, 235, 0.06), inset -1px 0 0 rgba(255,255,255,0.5)',
      }}
    >
      {/* Brand */}
      <div className="h-[80px] flex items-center justify-center lg:justify-start lg:px-6 shrink-0">
        {org.logo_url ? (
          <img
            src={org.logo_url}
            alt="Логотип"
            className="w-9 h-9 rounded-xl object-contain shrink-0"
          />
        ) : (
          <BrandMark size={36} />
        )}
        <div className="hidden lg:flex flex-col ml-3 min-w-0">
          <span
            className="text-[18px] leading-tight text-slate-800 font-extrabold truncate max-w-[140px]"
            title={org.name}
          >
            {org.name}
          </span>
          <span className="text-[9px] text-slate-400 font-bold mt-0.5 tracking-[0.22em] uppercase truncate max-w-[140px]">
            {org.tagline}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 mb-3" style={{ height: 1, background: 'rgba(37,99,235,0.08)' }} />

      {/* Role badge */}
      <div className="hidden lg:flex px-5 pb-3">
        <span
          className="text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full flex items-center gap-1.5"
          style={{ background: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}
        >
          {role === 'admin' && <ShieldCheck className="w-3 h-3" />}
          {roleLabel[role]}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/hr' || item.path === '/dashboard' || item.path === '/admin'}
            className="block"
          >
            {({ isActive }) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all duration-200"
                style={{
                  background: isActive ? 'rgba(37,99,235,0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(37,99,235,0.18)' : '1px solid transparent',
                  boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 8px rgba(37,99,235,0.1)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(37,99,235,0.05)';
                    e.currentTarget.style.border = '1px solid rgba(37,99,235,0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.border = '1px solid transparent';
                  }
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                      : 'rgba(37,99,235,0.07)',
                    boxShadow: isActive ? '0 3px 12px rgba(37,99,235,0.35)' : 'none',
                  }}
                >
                  <item.icon className="w-4 h-4" style={{ color: isActive ? 'white' : '#64748b' }} />
                </div>
                <span
                  className="hidden lg:block text-sm font-semibold transition-colors"
                  style={{ color: isActive ? '#1e40af' : '#64748b' }}
                >
                  {item.label}
                </span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3">
        <div className="mx-0 mb-3" style={{ height: 1, background: 'rgba(37,99,235,0.07)' }} />
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl w-full transition-all duration-200"
          style={{ border: '1px solid transparent' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.07)';
            e.currentTarget.style.border = '1px solid rgba(239,68,68,0.14)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.border = '1px solid transparent';
          }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.06)' }}>
            <LogOut className="w-4 h-4 text-red-400" />
          </div>
          <span className="hidden lg:block text-sm font-semibold text-red-400">Выйти</span>
        </button>
      </div>
    </aside>
  );
}
