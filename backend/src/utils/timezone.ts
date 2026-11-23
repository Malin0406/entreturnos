import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { TIMEZONE } from '../config/constants';

/** Chave de data no formato "yyyy-MM-dd" no fuso de São Paulo. */
export type DateKey = string;

const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isDateKey(value: string): boolean {
  return DATE_KEY_REGEX.test(value);
}

export function isTime(value: string): boolean {
  return TIME_REGEX.test(value);
}

/** Converte data local ("yyyy-MM-dd") + hora local ("HH:mm") de São Paulo em um Date UTC. */
export function zonedToUtc(dateKey: DateKey, time: string): Date {
  return fromZonedTime(`${dateKey}T${time}:00`, TIMEZONE);
}

/** Retorna a chave de data local de São Paulo para um instante. */
export function toDateKey(date: Date): DateKey {
  return formatInTimeZone(date, TIMEZONE, 'yyyy-MM-dd');
}

/** Retorna "HH:mm" local de São Paulo para um instante. */
export function toLocalTime(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, 'HH:mm');
}

/** Formata data/hora no padrão brasileiro. */
export function formatBR(date: Date, pattern = "dd/MM/yyyy 'às' HH:mm"): string {
  return formatInTimeZone(date, TIMEZONE, pattern);
}

/** Dia da semana (0 = domingo) de uma chave de data. */
export function weekdayOf(dateKey: DateKey): number {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay();
}

/** Soma dias a uma chave de data. */
export function addDaysToKey(dateKey: DateKey, days: number): DateKey {
  const base = new Date(`${dateKey}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Início do dia local (00:00 em São Paulo) em UTC. */
export function startOfLocalDay(dateKey: DateKey): Date {
  return zonedToUtc(dateKey, '00:00');
}

/** Lista de chaves de data entre dois instantes (inclusive), no fuso local. */
export function dateKeysBetween(start: Date, end: Date): DateKey[] {
  const keys: DateKey[] = [];
  let current = toDateKey(start);
  const last = toDateKey(end);
  while (current <= last) {
    keys.push(current);
    current = addDaysToKey(current, 1);
  }
  return keys;
}

/** Chave da segunda-feira da semana (semana iniciando na segunda). */
export function startOfWeekKey(dateKey: DateKey): DateKey {
  const weekday = weekdayOf(dateKey);
  const diff = weekday === 0 ? -6 : 1 - weekday;
  return addDaysToKey(dateKey, diff);
}

/** Converte "HH:mm" em minutos desde a meia-noite. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function diffMinutes(end: Date, start: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}
