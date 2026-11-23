import { Menu, Search, Timer } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatClock, usePomodoro } from '../../contexts/PomodoroContext';
import { cn, firstName, initials } from '../../utils/cn';
import { formatLongDate, greeting } from '../../utils/date';
import { POMODORO_LABEL } from '../../utils/labels';
import { NotificationsMenu } from './NotificationsMenu';

export function Header({ onMenu }: { onMenu: () => void }) {
  const { user } = useAuth();
  const pomodoro = usePomodoro();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    navigate(`/tarefas?busca=${encodeURIComponent(term)}`);
    setQuery('');
  };

  const longDate = formatLongDate(new Date());
  const today = longDate.charAt(0).toUpperCase() + longDate.slice(1);

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/85 backdrop-blur">
      <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-ink-900 sm:text-lg">
            {greeting()}, {user ? firstName(user.name) : ''}! 👋
          </p>
          <p className="truncate text-xs text-ink-500">{today}</p>
        </div>

        <form onSubmit={onSearch} className="relative hidden md:block" role="search">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tarefas…"
            aria-label="Buscar tarefas"
            className="h-10 w-56 rounded-xl border border-ink-200 bg-ink-50 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 lg:w-72"
          />
        </form>

        {pomodoro.status !== 'idle' && (
          <Link
            to="/pomodoro"
            className={cn(
              'hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold tabular-nums sm:flex',
              pomodoro.mode === 'FOCUS' ? 'bg-orange-50 text-orange-600' : 'bg-sky-50 text-sky-600',
            )}
            title={`${POMODORO_LABEL[pomodoro.mode]} ${pomodoro.status === 'paused' ? '(pausado)' : 'em andamento'}`}
          >
            <Timer className={cn('h-4 w-4', pomodoro.status === 'running' && 'animate-pulse')} aria-hidden />
            {formatClock(pomodoro.remainingMs)}
          </Link>
        )}

        <NotificationsMenu />

        <Link
          to="/perfil"
          className="flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-ink-50"
          aria-label="Meu perfil"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-brand-500 text-sm font-bold text-white">
            {user ? initials(user.name) : ''}
          </span>
          <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-ink-700 xl:block">{user?.name}</span>
        </Link>
      </div>
    </header>
  );
}
