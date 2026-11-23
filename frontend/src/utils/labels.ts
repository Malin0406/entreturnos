import type { CommuteMode, NotificationType, PomodoroType, Priority, TaskStatus } from '../types';

export const PRIORITY_LABEL: Record<Priority, string> = { HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' };
export const PRIORITY_STYLE: Record<Priority, string> = {
  HIGH: 'bg-red-50 text-red-700 ring-red-600/15',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  LOW: 'bg-sky-50 text-sky-700 ring-sky-600/15',
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
};
export const STATUS_STYLE: Record<TaskStatus, string> = {
  PENDING: 'bg-ink-100 text-ink-700 ring-ink-500/15',
  IN_PROGRESS: 'bg-sky-50 text-sky-700 ring-sky-600/15',
  COMPLETED: 'bg-brand-50 text-brand-700 ring-brand-600/15',
};

export const COMMUTE_MODE_LABEL: Record<CommuteMode, string> = {
  WALK: 'A pé',
  BUS: 'Ônibus',
  SUBWAY: 'Metrô/Trem',
  CAR: 'Carro',
  BIKE: 'Bicicleta',
  RIDE_APP: 'Aplicativo de transporte',
  OTHER: 'Outro',
};

export const POMODORO_LABEL: Record<PomodoroType, string> = {
  FOCUS: 'Foco',
  SHORT_BREAK: 'Pausa curta',
  LONG_BREAK: 'Pausa longa',
};

export const NOTIFICATION_STYLE: Record<NotificationType, string> = {
  TASK_DUE_SOON: 'bg-amber-50 text-amber-600',
  TASK_OVERDUE: 'bg-red-50 text-red-600',
  APPOINTMENT_SOON: 'bg-sky-50 text-sky-600',
  SUGGESTION_AVAILABLE: 'bg-brand-50 text-brand-600',
  SYSTEM: 'bg-ink-100 text-ink-500',
};

export const WEEKDAYS = [
  { value: 0, short: 'Dom', long: 'Domingo' },
  { value: 1, short: 'Seg', long: 'Segunda' },
  { value: 2, short: 'Ter', long: 'Terça' },
  { value: 3, short: 'Qua', long: 'Quarta' },
  { value: 4, short: 'Qui', long: 'Quinta' },
  { value: 5, short: 'Sex', long: 'Sexta' },
  { value: 6, short: 'Sáb', long: 'Sábado' },
];

/** "Seg a Sex", "Ter, Qui"… */
export function describeWeekdays(days: number[]): string {
  const sorted = [...days].sort();
  if (sorted.length === 7) return 'Todos os dias';
  const consecutive = sorted.length > 2 && sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (consecutive) return `${WEEKDAYS[sorted[0]].short} a ${WEEKDAYS[sorted[sorted.length - 1]].short}`;
  return sorted.map((d) => WEEKDAYS[d].short).join(', ');
}

export const COMMUTE_COLOR = '#94A3B8';
