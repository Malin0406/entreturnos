// Utilitários de data/hora. Todo o sistema usa o fuso America/Sao_Paulo e o padrão brasileiro.

export const TIMEZONE = 'America/Sao_Paulo';

function formatter(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TIMEZONE, ...options });
}

const timeFmt = formatter({ hour: '2-digit', minute: '2-digit', hour12: false });
const dateFmt = formatter({ day: '2-digit', month: '2-digit', year: 'numeric' });
const shortDateFmt = formatter({ day: '2-digit', month: '2-digit' });
const weekdayShortFmt = formatter({ weekday: 'short' });
const longDateFmt = formatter({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const dayMonthFmt = formatter({ weekday: 'short', day: '2-digit', month: 'short' });
const keyFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const hourFmt = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, hour: 'numeric', hour12: false });

type DateInput = string | number | Date;
const toDate = (value: DateInput) => (value instanceof Date ? value : new Date(value));

export const formatTime = (value: DateInput) => timeFmt.format(toDate(value));
export const formatDate = (value: DateInput) => dateFmt.format(toDate(value));
export const formatShortDate = (value: DateInput) => shortDateFmt.format(toDate(value));
export const formatDateTime = (value: DateInput) => `${formatDate(value)} às ${formatTime(value)}`;
export const formatLongDate = (value: DateInput) => longDateFmt.format(toDate(value));
export const formatDayMonth = (value: DateInput) => dayMonthFmt.format(toDate(value)).replace(/\./g, '');
export const formatWeekdayShort = (value: DateInput) => weekdayShortFmt.format(toDate(value)).replace('.', '');

/** "yyyy-MM-dd" no fuso de São Paulo. */
export const toDateKey = (value: DateInput) => keyFmt.format(toDate(value));

/** "HH:mm" no fuso de São Paulo. */
export const toTimeString = (value: DateInput) => formatTime(value);

/** Hora (0-23) atual em São Paulo. */
export const currentHour = () => Number(hourFmt.format(new Date())) % 24;

/** Data a partir de uma chave "yyyy-MM-dd" (meio-dia UTC, para evitar trocas de dia). */
export const dateFromKey = (key: string) => new Date(`${key}T12:00:00Z`);

/** Formata uma chave "yyyy-MM-dd" como dd/MM/yyyy. */
export const formatDateKey = (key: string) => {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
};

export function addDaysToKey(key: string, days: number) {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Deslocamento do fuso (ex.: "-03:00") em um instante. */
function offsetAt(instant: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, timeZoneName: 'longOffset' }).formatToParts(
    instant,
  );
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-03:00';
  const match = name.match(/GMT([+-]\d{2}:\d{2})/);
  return match ? match[1] : name === 'GMT' ? '+00:00' : '-03:00';
}

/** Converte data local ("yyyy-MM-dd") e hora local ("HH:mm") de São Paulo em ISO 8601 (UTC). */
export function zonedToISO(dateKey: string, time: string): string {
  const approx = new Date(`${dateKey}T${time}:00Z`);
  const offset = offsetAt(approx);
  return new Date(`${dateKey}T${time}:00${offset}`).toISOString();
}

/** Início do dia local em ISO. */
export const startOfDayISO = (key: string) => zonedToISO(key, '00:00');

/** Segunda-feira da semana de uma data. */
export function startOfWeekKey(key: string) {
  const weekday = dateFromKey(key).getUTCDay();
  return addDaysToKey(key, weekday === 0 ? -6 : 1 - weekday);
}

/** "2h 30min" a partir de minutos. */
export function formatMinutes(total: number): string {
  if (!total) return '0min';
  const hours = Math.floor(total / 60);
  const minutes = Math.round(total % 60);
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

/** Horas com uma casa decimal ("12,5h"). */
export const formatHours = (minutes: number) =>
  `${(minutes / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`;

export function greeting(): string {
  const hour = currentHour();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export const minutesBetween = (start: DateInput, end: DateInput) =>
  Math.round((toDate(end).getTime() - toDate(start).getTime()) / 60_000);

export type DeadlineState = 'overdue' | 'soon' | 'ok' | 'none';

/** Situação do prazo: atrasada, vence em até 48h, ok, ou sem prazo. */
export function deadlineState(dueDate: string | null, completed = false): DeadlineState {
  if (!dueDate || completed) return 'none';
  const diff = new Date(dueDate).getTime() - Date.now();
  if (diff < 0) return 'overdue';
  if (diff <= 48 * 3_600_000) return 'soon';
  return 'ok';
}

/** Texto relativo do prazo ("vence hoje às 23:59", "atrasada há 2 dias"). */
export function relativeDeadline(dueDate: string): string {
  const due = new Date(dueDate);
  const todayKey = toDateKey(new Date());
  const dueKey = toDateKey(due);
  const days = Math.round((dateFromKey(dueKey).getTime() - dateFromKey(todayKey).getTime()) / 86_400_000);
  if (due.getTime() < Date.now()) {
    if (days === 0) return `venceu hoje às ${formatTime(due)}`;
    const ago = Math.abs(days);
    return `atrasada há ${ago} dia${ago > 1 ? 's' : ''}`;
  }
  if (days === 0) return `vence hoje às ${formatTime(due)}`;
  if (days === 1) return `vence amanhã às ${formatTime(due)}`;
  return `vence em ${days} dias (${formatShortDate(due)})`;
}
