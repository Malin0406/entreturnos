import { AlarmClock, Bell, CalendarClock, CheckCheck, Info, Sparkles, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { notificationApi } from '../../services/endpoints';
import type { AppNotification, NotificationType } from '../../types';
import { cn } from '../../utils/cn';
import { formatDayMonth, formatTime } from '../../utils/date';
import { NOTIFICATION_STYLE } from '../../utils/labels';

const ICONS: Record<NotificationType, typeof Bell> = {
  TASK_DUE_SOON: AlarmClock,
  TASK_OVERDUE: TriangleAlert,
  APPOINTMENT_SOON: CalendarClock,
  SUGGESTION_AVAILABLE: Sparkles,
  SYSTEM: Info,
};

export function NotificationIcon({ type }: { type: NotificationType }) {
  const Icon = ICONS[type];
  return (
    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', NOTIFICATION_STYLE[type])}>
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
}

const POLL_INTERVAL = 60_000;

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const load = useCallback(async () => {
    try {
      const data = await notificationApi.list();
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      /* silencioso: o sino apenas não atualiza */
    }
  }, []);

  // Atualiza periodicamente e a cada troca de página.
  useEffect(() => {
    void load();
    const interval = window.setInterval(load, POLL_INTERVAL);
    return () => window.clearInterval(interval);
  }, [load, location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = async (item: AppNotification) => {
    if (!item.read) {
      setItems((list) => list.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
      void notificationApi.markRead(item.id).catch(() => undefined);
    }
    setOpen(false);
    if (item.link) navigate(item.link);
  };

  const markAll = async () => {
    await notificationApi.markAllRead().catch(() => undefined);
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 transition hover:text-ink-900"
        aria-label={`Notificações${unread ? ` (${unread} não lidas)` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-slide-up overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <p className="text-sm font-bold text-ink-900">Notificações</p>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                <CheckCheck className="h-3.5 w-3.5" /> Marcar todas como lidas
              </button>
            )}
          </div>
          <ul className="max-h-96 divide-y divide-ink-100 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-500">Nenhuma notificação por aqui.</li>}
            {items.slice(0, 8).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openItem(item)}
                  className={cn('flex w-full gap-3 px-4 py-3 text-left transition hover:bg-ink-50', !item.read && 'bg-brand-50/40')}
                >
                  <NotificationIcon type={item.type} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink-900">{item.title}</span>
                      {!item.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="não lida" />}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-500">{item.message}</span>
                    <span className="mt-1 block text-[11px] text-ink-400">
                      {formatDayMonth(item.createdAt)}, {formatTime(item.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Link
            to="/notificacoes"
            onClick={() => setOpen(false)}
            className="block border-t border-ink-100 px-4 py-2.5 text-center text-xs font-semibold text-ink-700 hover:bg-ink-50"
          >
            Ver todas as notificações
          </Link>
        </div>
      )}
    </div>
  );
}
