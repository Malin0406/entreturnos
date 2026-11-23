import { z } from 'zod';
import { dateKey, isoDateTime, uuid } from './common';

export const pomodoroSchema = z
  .object({
    taskId: uuid.nullable().optional().transform((v) => v ?? null),
    type: z.enum(['FOCUS', 'SHORT_BREAK', 'LONG_BREAK']).default('FOCUS'),
    durationMinutes: z.number().int().min(1).max(180),
    startedAt: isoDateTime,
    endedAt: isoDateTime,
    completed: z.boolean().default(true),
  })
  .refine((d) => d.endedAt >= d.startedAt, { message: 'Fim deve ser após o início.', path: ['endedAt'] });

export const pomodoroListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const planningQuery = z.object({
  start: dateKey.optional(),
  days: z.coerce.number().int().min(1).max(14).optional(),
});

export const reportsQuery = z.object({
  weeks: z.coerce.number().int().min(2).max(26).default(8),
});

export type PomodoroInput = z.infer<typeof pomodoroSchema>;
