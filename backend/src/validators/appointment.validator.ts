import { z } from 'zod';
import { dateKey, isEndAfterStart, isoDateTime, optionalText, timeString, uuid } from './common';

const appointmentBase = z.object({
  title: z.string().trim().min(1, 'Informe o título.').max(150),
  description: optionalText(2000),
  location: optionalText(150),
  categoryId: uuid,
  startAt: isoDateTime,
  endAt: isoDateTime,
  /** Quando true, salva mesmo havendo conflito de horário. */
  force: z.boolean().optional().default(false),
});

export const appointmentSchema = appointmentBase.refine((d) => d.endAt > d.startAt, {
  message: 'O horário final deve ser após o inicial.',
  path: ['endAt'],
});

const recurringBase = z.object({
  title: z.string().trim().min(1, 'Informe o título.').max(150),
  description: optionalText(2000),
  location: optionalText(150),
  categoryId: uuid,
  weekdays: z
    .array(z.number().int().min(0).max(6))
    .min(1, 'Selecione ao menos um dia da semana.')
    .transform((days) => Array.from(new Set(days)).sort()),
  startTime: timeString,
  endTime: timeString,
  startDate: dateKey,
  endDate: dateKey.nullable().optional().transform((v) => v ?? null),
  force: z.boolean().optional().default(false),
});

export const recurringSchema = recurringBase
  .refine((d) => isEndAfterStart(d.startTime, d.endTime), {
    message: 'O horário final deve ser após o inicial.',
    path: ['endTime'],
  })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, {
    message: 'A data de término deve ser igual ou posterior à data de início.',
    path: ['endDate'],
  });

const commuteBase = z.object({
  origin: z.string().trim().min(1, 'Informe a origem.').max(150),
  destination: z.string().trim().min(1, 'Informe o destino.').max(150),
  durationMinutes: z.number().int().min(1, 'Mínimo de 1 minuto.').max(600, 'Máximo de 10 horas.'),
  mode: z.enum(['WALK', 'BUS', 'SUBWAY', 'CAR', 'BIKE', 'RIDE_APP', 'OTHER']).default('BUS'),
  position: z.enum(['BEFORE', 'AFTER']).default('AFTER'),
  startAt: isoDateTime.nullable().optional().transform((v) => v ?? null),
  appointmentId: uuid.nullable().optional().transform((v) => v ?? null),
  recurringAppointmentId: uuid.nullable().optional().transform((v) => v ?? null),
  force: z.boolean().optional().default(false),
});

export const commuteSchema = commuteBase.refine(
  (d) => [d.startAt, d.appointmentId, d.recurringAppointmentId].filter(Boolean).length === 1,
  {
    message: 'Informe um compromisso relacionado ou um horário de início para o deslocamento avulso.',
    path: ['startAt'],
  },
);

export type AppointmentInput = z.infer<typeof appointmentSchema>;
export type RecurringInput = z.infer<typeof recurringSchema>;
export type CommuteInput = z.infer<typeof commuteSchema>;
