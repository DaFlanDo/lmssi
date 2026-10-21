import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellDot, CheckCheck } from 'lucide-react';
import { apiGet, apiPut } from '../../lib/api';
import type { NotificationRead, UnreadCountRead } from '../../types';

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRead[]>([]);
  const [loading, setLoading] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const fetchCount = async () => {
    try {
      const data = await apiGet<UnreadCountRead>('/api/notifications/unread-count');
      setUnread(data.count);
    } catch { /* ignore */ }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await apiGet<NotificationRead[]>('/api/notifications/');
      setNotifications(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleToggle = () => {
    if (!open) fetchNotifications();
    setOpen((v) => !v);
  };

  const markRead = async (id: number) => {
    try {
      await apiPut<void>(`/api/notifications/${id}/read`, {});
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnread((prev) => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await apiPut<void>('/api/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch { /* ignore */ }
  };

  const fmt = (dt: string | null) => {
    if (!dt) return '';
    return new Date(dt).toLocaleString('ru-RU', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={handleToggle}
        className="relative w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-600 transition-colors shadow-sm border border-white/60"
      >
        {unread > 0 ? <BellDot className="w-5 h-5 text-brand" /> : <Bell className="w-5 h-5" />}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center leading-none px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p className="font-bold text-slate-800 text-sm">Уведомления</p>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-brand font-bold hover:text-brand-dark transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Прочитать все
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
              {loading ? (
                <div className="py-8 text-center text-slate-400 text-sm font-medium">Загрузка...</div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm font-medium">Нет уведомлений</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && markRead(n.id)}
                    className={`px-4 py-3 transition-colors ${
                      n.is_read ? 'bg-white cursor-default' : 'bg-brand/5 hover:bg-brand/8 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-brand shrink-0 mt-1.5" />
                      )}
                      <div className={n.is_read ? 'pl-4' : ''}>
                        <p className={`text-sm leading-snug ${n.is_read ? 'text-slate-500 font-medium' : 'text-slate-800 font-bold'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-slate-300 font-semibold mt-1">{fmt(n.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
