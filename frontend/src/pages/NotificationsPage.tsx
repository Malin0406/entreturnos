import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationIcon } from '../components/layout/NotificationsMenu';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui/Feedback';
import { useToast } from '../contexts/ToastContext';
import { useApi } from '../hooks/useApi';
import { errorMessage } from '../services/api';
import { notificationApi } from '../services/endpoints';
import type { AppNotification } from '../types';
import { cn } from '../utils/cn';
import { formatDateTime } from '../utils/date';

export function NotificationsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { data, loading, error, reload, setData } = useApi(() => notificationApi.list(), []);

  const markRead = async (item: AppNotification) => {
    if (item.read) return;
    setData((d) => d && { items: d.items.map((n) => (n.id === item.id ? { ...n, read: true } : n)), unread: Math.max(0, d.unread - 1) });
    await notificationApi.markRead(item.id).catch(() => void reload());
  };

  const open = async (item: AppNotification) => {
    await markRead(item);
    if (item.link) navigate(item.link);
  };

  const markAll = async () => {
    try {
      await notificationApi.markAllRead();
      void reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (item: AppNotification) => {
    try {
      await notificationApi.remove(item.id);
      setData((d) => d && { items: d.items.filter((n) => n.id !== item.id), unread: d.unread - (item.read ? 0 : 1) });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Notificações"
        description="Prazos próximos, tarefas atrasadas, compromissos em breve e novas sugestões de horários."
        actions={
          data && data.unread > 0 ? (
            <Button variant="secondary" icon={<CheckCheck className="h-4 w-4" />} onClick={markAll}>
              Marcar todas como lidas
            </Button>
          ) : undefined
        }
      />
      <Card>
        {loading && !data && <Spinner />}
        {error && <div className="p-4"><ErrorState message={error} onRetry={reload} /></div>}
        {data && data.items.length === 0 && (
          <EmptyState icon={<Bell className="h-5 w-5" />} title="Nenhuma notificação" description="Você será avisado aqui sobre prazos e compromissos." />
        )}
        {data && data.items.length > 0 && (
          <ul className="divide-y divide-ink-100">
            {data.items.map((item) => (
              <li key={item.id} className={cn('flex items-start gap-3 px-5 py-4', !item.read && 'bg-brand-50/40')}>
                <NotificationIcon type={item.type} />
                <button type="button" onClick={() => open(item)} className="min-w-0 flex-1 text-left">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink-900">{item.title}</span>
                    {!item.read && <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">Nova</span>}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-500">{item.message}</span>
                  <span className="mt-1 block text-xs text-ink-400">{formatDateTime(item.createdAt)}</span>
                </button>
                <div className="flex shrink-0 gap-1">
                  {!item.read && (
                    <button type="button" onClick={() => markRead(item)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label="Marcar como lida">
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                  <button type="button" onClick={() => remove(item)} className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600" aria-label="Excluir notificação">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
