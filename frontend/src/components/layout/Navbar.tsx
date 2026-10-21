import type { ReactNode } from 'react';
import { ChevronDown, LogOut, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { NotificationBell } from '../ui/NotificationBell';

interface Props {
  title?: string;
  subtitle?: string;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
}

export function Navbar({ title, subtitle, leftContent, rightContent }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')
    : '??';

  return (
    <nav className="glass-nav rounded-[2rem] px-6 py-3 mx-6 mt-6 mb-4 flex justify-between items-center shadow-[0_4px_30px_rgba(0,0,0,0.05)] shrink-0 z-50">
      {/* Left */}
      <div className="flex items-center gap-4">
        {leftContent}
        {(title || subtitle) && (
          <div>
            {subtitle && (
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                {subtitle}
              </div>
            )}
            {title && (
              <h1 className="font-extrabold text-slate-800 text-base leading-tight">{title}</h1>
            )}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {rightContent}
        <NotificationBell />

        {/* User dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setDropOpen(!dropOpen)}
            className="flex items-center gap-2 bg-white/80 hover:bg-white px-2 py-1.5 rounded-full transition-colors shadow-sm border border-white/60"
          >
            <div className="w-8 h-8 rounded-full bg-brand-light text-brand flex items-center justify-center font-extrabold text-xs">
              {initials}
            </div>
            <span className="hidden sm:block text-sm font-bold text-slate-700 max-w-[120px] truncate">
              {user?.full_name}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {dropOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-800 truncate">{user?.full_name}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { setDropOpen(false); navigate('/profile'); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <UserCircle className="w-4 h-4" /> Профиль
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
