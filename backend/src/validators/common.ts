import { z } from 'zod';
import { isDateKey, isTime, timeToMinutes } from '../utils/timezone';

export const isoDateTime = z
  .string({ required_error: 'Data/hora obrigatória.' })
  .datetime({ offset: true, message: 'Data/hora inválida (use ISO 8601).' })
  .transform((value) => new Date(value));

export const dateKey = z.string().refine(isDateKey, 'Data inválida (use aaaa-mm-dd).');

export const timeString = z.string().refine(isTime, 'Horário inválido (use HH:mm).');

export const uuid = z.string().uuid('Identificador inválido.');

export const idParam = z.object({ id: uuid });

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

export function isEndAfterStart(start: string, end: string): boolean {
  return timeToMinutes(end) > timeToMinutes(start);
}

export const rangeQuery = z
  .object({ start: isoDateTime, end: isoDateTime })
  .refine((q) => q.end > q.start, { message: 'O fim deve ser posterior ao início.', path: ['end'] })
  .refine((q) => q.end.getTime() - q.start.getTime() <= 1000 * 60 * 60 * 24 * 120, {
    message: 'Intervalo máximo de 120 dias.',
    path: ['end'],
  });
