import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { Interval, commuteInterval, expandRecurring } from '../domain/scheduling';
import { AppError } from '../utils/AppError';
import { addDaysToKey, toDateKey, zonedToUtc } from '../utils/timezone';
import { AppointmentInput, CommuteInput, RecurringInput } from '../validators/appointment.validator';
import { calendarService } from './calendar.service';
import { categoryService } from './category.service';

/** Janela usada para verificar conflitos de regras recorrentes (próximos 60 dias da regra). */
const RECURRING_CHECK_DAYS = 60;

function recurringCheckWindow(rule: { startDate: string; endDate: string | null }): Interval {
  const todayKey = toDateKey(new Date());
  const fromKey = rule.startDate > todayKey ? rule.startDate : todayKey;
  let toKey = addDaysToKey(fromKey, RECURRING_CHECK_DAYS);
  if (rule.endDate && rule.endDate < toKey) toKey = rule.endDate;
  return { start: zonedToUtc(fromKey, '00:00'), end: zonedToUtc(addDaysToKey(toKey, 1), '00:00') };
}

const appointmentInclude = { category: true, commutes: true } satisfies Prisma.AppointmentInclude;

/* ------------------------------------------------------------------ */
/* Compromissos únicos                                                 */
/* ------------------------------------------------------------------ */

async function findAppointment(userId: string, id: string) {
  const appointment = await prisma.appointment.findFirst({ where: { id, userId }, include: appointmentInclude });
  if (!appointment) throw AppError.notFound('Compromisso');
  return appointment;
}

export const appointmentService = {
  list(userId: string, range?: Interval) {
    return prisma.appointment.findMany({
      where: { userId, ...(range ? { startAt: { lt: range.end }, endAt: { gt: range.start } } : {}) },
      include: appointmentInclude,
      orderBy: { startAt: 'asc' },
    });
  },

  get: findAppointment,

  async create(userId: string, input: AppointmentInput) {
    await categoryService.assertExists(input.categoryId);
    await calendarService.assertNoConflicts(userId, [{ start: input.startAt, end: input.endAt }], {
      force: input.force,
    });
    const { force: _force, ...data } = input;
    return prisma.appointment.create({ data: { ...data, userId }, include: appointmentInclude });
  },

  async update(userId: string, id: string, input: AppointmentInput) {
    const current = await findAppointment(userId, id);
    await categoryService.assertExists(input.categoryId);
    await calendarService.assertNoConflicts(userId, [{ start: input.startAt, end: input.endAt }], {
      force: input.force,
      ignoreSourceIds: [current.id, ...current.commutes.map((c) => c.id)],
    });
    const { force: _force, ...data } = input;
    return prisma.appointment.update({ where: { id: current.id }, data, include: appointmentInclude });
  },

  async remove(userId: string, id: string) {
    const current = await findAppointment(userId, id);
    // Se o compromisso veio de uma sugestão aceita, a sugestão volta a ficar disponível para recálculo.
    await prisma.scheduleSuggestion.deleteMany({ where: { appointmentId: current.id } });
    await prisma.appointment.delete({ where: { id: current.id } });
  },
};

/* ------------------------------------------------------------------ */
/* Compromissos recorrentes                                            */
/* ------------------------------------------------------------------ */

const recurringInclude = { category: true, commutes: true } satisfies Prisma.RecurringAppointmentInclude;

async function findRecurring(userId: string, id: string) {
  const rule = await prisma.recurringAppointment.findFirst({ where: { id, userId }, include: recurringInclude });
  if (!rule) throw AppError.notFound('Compromisso recorrente');
  return rule;
}

function recurringCandidates(input: RecurringInput): Interval[] {
  const window = recurringCheckWindow(input);
  return expandRecurring({ id: 'candidate', ...input }, window.start, window.end);
}

export const recurringService = {
  list(userId: string) {
    return prisma.recurringAppointment.findMany({
      where: { userId },
      include: recurringInclude,
      orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
    });
  },

  get: findRecurring,

  async create(userId: string, input: RecurringInput) {
    await categoryService.assertExists(input.categoryId);
    await calendarService.assertNoConflicts(userId, recurringCandidates(input), { force: input.force });
    const { force: _force, ...data } = input;
    return prisma.recurringAppointment.create({ data: { ...data, userId }, include: recurringInclude });
  },

  async update(userId: string, id: string, input: RecurringInput) {
    const current = await findRecurring(userId, id);
    await categoryService.assertExists(input.categoryId);
    await calendarService.assertNoConflicts(userId, recurringCandidates(input), {
      force: input.force,
      ignoreSourceIds: [current.id, ...current.commutes.map((c) => c.id)],
    });
    const { force: _force, ...data } = input;
    return prisma.recurringAppointment.update({ where: { id: current.id }, data, include: recurringInclude });
  },

  async remove(userId: string, id: string) {
    const current = await findRecurring(userId, id);
    await prisma.recurringAppointment.delete({ where: { id: current.id } });
  },
};

/* ------------------------------------------------------------------ */
/* Deslocamentos                                                       */
/* ------------------------------------------------------------------ */

const commuteInclude = {
  appointment: { select: { id: true, title: true, startAt: true, endAt: true } },
  recurringAppointment: { select: { id: true, title: true, startTime: true, endTime: true, weekdays: true } },
} satisfies Prisma.CommuteInclude;

async function findCommute(userId: string, id: string) {
  const commute = await prisma.commute.findFirst({ where: { id, userId }, include: commuteInclude });
  if (!commute) throw AppError.notFound('Deslocamento');
  return commute;
}

/** Calcula os intervalos que o deslocamento ocupará e o id do compromisso âncora. */
async function commuteCandidates(userId: string, input: CommuteInput): Promise<{ intervals: Interval[]; anchorId?: string }> {
  if (input.appointmentId) {
    const appt = await prisma.appointment.findFirst({ where: { id: input.appointmentId, userId } });
    if (!appt) throw new AppError('Compromisso relacionado não encontrado.', 422);
    const interval = commuteInterval(input, { start: appt.startAt, end: appt.endAt });
    return { intervals: interval ? [interval] : [], anchorId: appt.id };
  }
  if (input.recurringAppointmentId) {
    const rule = await prisma.recurringAppointment.findFirst({ where: { id: input.recurringAppointmentId, userId } });
    if (!rule) throw new AppError('Compromisso recorrente relacionado não encontrado.', 422);
    const window = recurringCheckWindow(rule);
    const intervals = expandRecurring(rule, window.start, window.end)
      .map((occ) => commuteInterval(input, occ))
      .filter((i): i is Interval => i !== null);
    return { intervals, anchorId: rule.id };
  }
  const interval = commuteInterval({ ...input, position: 'AFTER' });
  return { intervals: interval ? [interval] : [] };
}

export const commuteService = {
  list(userId: string) {
    return prisma.commute.findMany({ where: { userId }, include: commuteInclude, orderBy: { createdAt: 'asc' } });
  },

  get: findCommute,

  async create(userId: string, input: CommuteInput) {
    const { intervals, anchorId } = await commuteCandidates(userId, input);
    await calendarService.assertNoConflicts(userId, intervals, {
      force: input.force,
      ignoreSourceIds: anchorId ? [anchorId] : [],
    });
    const { force: _force, ...data } = input;
    return prisma.commute.create({ data: { ...data, userId }, include: commuteInclude });
  },

  async update(userId: string, id: string, input: CommuteInput) {
    const current = await findCommute(userId, id);
    const { intervals, anchorId } = await commuteCandidates(userId, input);
    await calendarService.assertNoConflicts(userId, intervals, {
      force: input.force,
      ignoreSourceIds: [current.id, ...(anchorId ? [anchorId] : [])],
    });
    const { force: _force, ...data } = input;
    return prisma.commute.update({ where: { id: current.id }, data, include: commuteInclude });
  },

  async remove(userId: string, id: string) {
    const current = await findCommute(userId, id);
    await prisma.commute.delete({ where: { id: current.id } });
  },
};
