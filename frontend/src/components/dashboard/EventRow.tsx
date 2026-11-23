import { Bus, MapPin, Repeat } from 'lucide-react';
import type { CalendarEvent } from '../../types';
import { cn } from '../../utils/cn';
import { formatTime } from '../../utils/date';
import { COMMUTE_COLOR } from '../../utils/labels';

/** Linha de evento usada nas listas do dashboard. */
export function EventRow({ event, showDate }: { event: CalendarEvent; showDate?: string }) {
  const color = event.kind === 'COMMUTE' ? COMMUTE_COLOR : (event.category?.color ?? '#64748B');
  const now = Date.now();
  const happening = new Date(event.start).getTime() <= now && new Date(event.end).getTime() > now;
  const past = new Date(event.end).getTime() <= now;

  return (
    <li className={cn('flex gap-3 rounded-xl p-2.5 transition', happening && 'bg-brand-50/70', past && 'opacity-55')}>
      <div className="w-12 shrink-0 pt-0.5 text-right">
        {showDate && <p className="text-[10px] font-semibold uppercase text-ink-400">{showDate}</p>}
        <p className="text-sm font-bold tabular-nums text-ink-900">{formatTime(event.start)}</p>
        <p className="text-[11px] tabular-nums text-ink-400">{formatTime(event.end)}</p>
      </div>
      <span className="w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-semibold', event.kind === 'COMMUTE' ? 'text-ink-500' : 'text-ink-900')}>
          {event.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-500">
          {event.kind === 'COMMUTE' && (
            <span className="inline-flex items-center gap-1">
              <Bus className="h-3 w-3" aria-hidden /> {event.commute?.durationMinutes} min
            </span>
          )}
          {event.kind === 'RECURRING' && (
            <span className="inline-flex items-center gap-1">
              <Repeat className="h-3 w-3" aria-hidden /> Fixo
            </span>
          )}
          {event.category && <span>{event.category.name}</span>}
          {event.location && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{event.location}</span>
            </span>
          )}
          {happening && <span className="font-semibold text-brand-700">Agora</span>}
        </div>
      </div>
    </li>
  );
}
