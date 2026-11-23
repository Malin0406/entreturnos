import { z } from 'zod';
import { passwordRule } from './auth.validator';
import { isEndAfterStart, timeString } from './common';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(3, 'Informe o nome completo.').max(100),
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

const minutes = (min: number, max: number) => z.number().int().min(min).max(max);

export const updatePreferencesSchema = z
  .object({
    availabilityStart: timeString,
    availabilityEnd: timeString,
    availableWeekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Selecione ao menos um dia.'),
    breakMinutes: minutes(0, 60),
    minSlotMinutes: minutes(5, 240),
    maxTaskBlockMinutes: minutes(15, 480),
    planningHorizonDays: minutes(1, 14),
    pomodoroFocusMinutes: minutes(1, 120),
    pomodoroShortBreakMinutes: minutes(1, 60),
    pomodoroLongBreakMinutes: minutes(1, 90),
    pomodoroCyclesBeforeLong: minutes(1, 12),
    notifyTaskDeadlines: z.boolean(),
    notifyAppointments: z.boolean(),
    notifySuggestions: z.boolean(),
    deadlineAlertHours: minutes(1, 168),
    appointmentAlertMinutes: minutes(5, 1440),
  })
  .partial()
  .refine(
    (d) => !d.availabilityStart || !d.availabilityEnd || isEndAfterStart(d.availabilityStart, d.availabilityEnd),
    { message: 'O fim da disponibilidade deve ser após o início.', path: ['availabilityEnd'] },
  );

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
