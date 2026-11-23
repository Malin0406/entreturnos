import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { calendarApi } from '../../services/endpoints';
import { cn } from '../../utils/cn';
import { addDaysToKey, dateFromKey, toDateKey, zonedToISO } from '../../utils/date';

const WEEK_HEADER = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const monthFmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Calendário compacto do mês: marca os dias com compromissos e leva à agenda ao clicar. */
export function MiniCalendar() {
  const navigate = useNavigate();
  const todayKey = toDateKey(new Date());
  const [month, setMonth] = useState(() => todayKey.slice(0, 7)); // "yyyy-MM"
  const [eventDays, setEventDays] = useState<Map<string, string[]>>(new Map());

  const firstKey = `${month}-01`;
  const days = useMemo(() => {
    const first = dateFromKey(firstKey);
    const gridStart = addDaysToKey(firstKey, -first.getUTCDay());
    return Array.from({ length: 42 }, (_, i) => addDaysToKey(gridStart, i));
  }, [firstKey]);

  useEffect(() => {
    const start = zonedToISO(days[0], '00:00');
    const end = zonedToISO(addDaysToKey(days[days.length - 1], 1), '00:00');
    calendarApi
      .events(start, end)
      .then((events) => {
        const map = new Map<string, string[]>();
        for (const event of events) {
          if (event.kind === 'COMMUTE') continue;
          const key = toDateKey(event.start);
          const colors = map.get(key) ?? [];
          const color = event.category?.color ?? '#64748B';
          if (!colors.includes(color)) colors.push(color);
          map.set(key, colors);
        }
        setEventDays(map);
      })
      .catch(() => setEventDays(new Map()));
  }, [days]);

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(date.toISOString().slice(0, 7));
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold capitalize text-ink-900">{monthFmt.format(dateFromKey(firstKey))}</p>
        <div className="flex gap-1">
          <button type="button" onClick={() => shiftMonth(-1)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100" aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => shiftMonth(1)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100" aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEK_HEADER.map((d, i) => (
          <span key={i} className="pb-1 text-[11px] font-semibold text-ink-400">
            {d}
          </span>
        ))}
        {days.map((key) => {
          const inMonth = key.startsWith(month);
          const isToday = key === todayKey;
          const colors = eventDays.get(key) ?? [];
          return (
            <button
              key={key}
              type="button"
              onClick={() => navigate(`/agenda?data=${key}`)}
              className={cn(
                'mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-xl text-xs font-semibold transition',
                isToday ? 'bg-brand-600 text-white' : inMonth ? 'text-ink-700 hover:bg-ink-100' : 'text-ink-300 hover:bg-ink-50',
              )}
              aria-label={`Abrir agenda em ${key.split('-').reverse().join('/')}`}
            >
              {Number(key.slice(8))}
              <span className="mt-0.5 flex h-1 gap-0.5">
                {colors.slice(0, 3).map((color) => (
                  <span key={color} className="h-1 w-1 rounded-full" style={{ backgroundColor: isToday ? '#fff' : color }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
