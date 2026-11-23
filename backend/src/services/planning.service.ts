import { UserPreference } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  AvailabilityPreferences,
  FreeSlot,
  SchedulableTask,
  computeFreeSlots,
  findConflicts,
  generateSuggestions,
} from '../domain/scheduling';
import { AppError } from '../utils/AppError';
import { DateKey, addDaysToKey, diffMinutes, toDateKey, zonedToUtc } from '../utils/timezone';
import { calendarService } from './calendar.service';
import { preferenceService } from './user.service';

export function toAvailability(pref: UserPreference): AvailabilityPreferences {
  return {
    availabilityStart: pref.availabilityStart,
    availabilityEnd: pref.availabilityEnd,
    availableWeekdays: pref.availableWeekdays,
    breakMinutes: pref.breakMinutes,
    minSlotMinutes: pref.minSlotMinutes,
    maxTaskBlockMinutes: pref.maxTaskBlockMinutes,
  };
}

const suggestionInclude = { task: { include: { category: true } } } as const;

async function getFreeSlots(userId: string, startKey: DateKey, days: number, now = new Date()) {
  const pref = await preferenceService.get(userId);
  const dateKeys = Array.from({ length: days }, (_, i) => addDaysToKey(startKey, i));
  const rangeStart = zonedToUtc(startKey, '00:00');
  const rangeEnd = zonedToUtc(addDaysToKey(startKey, days), '00:00');
  const busy = await calendarService.getBusyBlocks(userId, rangeStart, rangeEnd);
  const slots = computeFreeSlots({ dateKeys, busy, preferences: toAvailability(pref), now });
  return { slots, busy, preference: pref };
}

function summarizeSlots(slots: FreeSlot[]) {
  return {
    count: slots.length,
    totalMinutes: slots.reduce((sum, s) => sum + s.minutes, 0),
  };
}

export const planningService = {
  getFreeSlots,
  summarizeSlots,

  async freeSlotsReport(userId: string, startKey?: DateKey, days?: number) {
    const pref = await preferenceService.get(userId);
    const start = startKey ?? toDateKey(new Date());
    const horizon = days ?? pref.planningHorizonDays;
    const { slots, busy } = await getFreeSlots(userId, start, horizon);
    const byDay = Array.from({ length: horizon }, (_, i) => {
      const dateKey = addDaysToKey(start, i);
      const daySlots = slots.filter((s) => s.dateKey === dateKey);
      return { dateKey, ...summarizeSlots(daySlots), slots: daySlots };
    });
    return { start, days: horizon, ...summarizeSlots(slots), byDay, busyCount: busy.length };
  },

  /**
   * Recalcula as sugestões: descarta as pendentes, identifica horários livres e
   * distribui as tarefas não concluídas. Nada é agendado sem aceite do usuário.
   */
  async generate(userId: string, now = new Date()) {
    const pref = await preferenceService.get(userId);
    const startKey = toDateKey(now);
    const { slots } = await getFreeSlots(userId, startKey, pref.planningHorizonDays, now);

    const [tasks, futureBlocks, rejected] = await Promise.all([
      prisma.task.findMany({ where: { userId, status: { not: 'COMPLETED' } } }),
      prisma.appointment.findMany({ where: { userId, taskId: { not: null }, endAt: { gt: now } } }),
      prisma.scheduleSuggestion.findMany({ where: { userId, status: 'REJECTED', endAt: { gt: now } } }),
    ]);

    const schedulable: SchedulableTask[] = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate,
      estimatedMinutes: task.estimatedMinutes,
      scheduledMinutes: futureBlocks
        .filter((block) => block.taskId === task.id)
        .reduce((sum, block) => sum + diffMinutes(block.endAt, block.startAt), 0),
      blocked: rejected.filter((r) => r.taskId === task.id).map((r) => ({ start: r.startAt, end: r.endAt })),
    }));

    const drafts = generateSuggestions({ tasks: schedulable, freeSlots: slots, preferences: toAvailability(pref), now });

    await prisma.$transaction([
      prisma.scheduleSuggestion.deleteMany({ where: { userId, status: 'PENDING' } }),
      prisma.scheduleSuggestion.createMany({
        data: drafts.map((d) => ({
          userId,
          taskId: d.taskId,
          startAt: d.start,
          endAt: d.end,
          score: d.score,
          reason: d.reason,
        })),
      }),
    ]);

    if (pref.notifySuggestions && drafts.length > 0) {
      await prisma.notification.upsert({
        where: { userId_dedupeKey: { userId, dedupeKey: `suggestions:${startKey}` } },
        update: {
          message: `${drafts.length} sugestão(ões) de horário disponível(is) para suas tarefas.`,
          read: false,
        },
        create: {
          userId,
          type: 'SUGGESTION_AVAILABLE',
          title: 'Novas sugestões de horário',
          message: `${drafts.length} sugestão(ões) de horário disponível(is) para suas tarefas.`,
          link: '/planejamento',
          dedupeKey: `suggestions:${startKey}`,
        },
      });
    }

    return this.list(userId, now);
  },

  async list(userId: string, now = new Date()) {
    const [pending, history] = await Promise.all([
      prisma.scheduleSuggestion.findMany({
        where: { userId, status: 'PENDING', startAt: { gte: now } },
        include: suggestionInclude,
        orderBy: { startAt: 'asc' },
      }),
      prisma.scheduleSuggestion.findMany({
        where: { userId, status: { in: ['ACCEPTED', 'REJECTED'] } },
        include: suggestionInclude,
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);
    return { pending, history };
  },

  async accept(userId: string, id: string) {
    const suggestion = await prisma.scheduleSuggestion.findFirst({
      where: { id, userId },
      include: { task: true },
    });
    if (!suggestion) throw AppError.notFound('Sugestão');
    if (suggestion.status !== 'PENDING') throw new AppError('Esta sugestão já foi respondida.', 400);
    if (suggestion.startAt < new Date()) throw new AppError('Esta sugestão expirou. Gere novas sugestões.', 400);

    // A agenda pode ter mudado desde a geração: revalida antes de reservar.
    const busy = await calendarService.getBusyBlocks(userId, suggestion.startAt, suggestion.endAt);
    if (findConflicts({ start: suggestion.startAt, end: suggestion.endAt }, busy).length > 0) {
      throw AppError.conflict('O horário sugerido não está mais livre. Gere novas sugestões.');
    }

    return prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          userId,
          categoryId: suggestion.task.categoryId,
          taskId: suggestion.taskId,
          title: suggestion.task.title,
          description: 'Bloco de tempo planejado pelo EntreTurnos.',
          startAt: suggestion.startAt,
          endAt: suggestion.endAt,
        },
      });
      return tx.scheduleSuggestion.update({
        where: { id: suggestion.id },
        data: { status: 'ACCEPTED', appointmentId: appointment.id },
        include: suggestionInclude,
      });
    });
  },

  async reject(userId: string, id: string) {
    const suggestion = await prisma.scheduleSuggestion.findFirst({ where: { id, userId } });
    if (!suggestion) throw AppError.notFound('Sugestão');
    if (suggestion.status !== 'PENDING') throw new AppError('Esta sugestão já foi respondida.', 400);
    return prisma.scheduleSuggestion.update({
      where: { id: suggestion.id },
      data: { status: 'REJECTED' },
      include: suggestionInclude,
    });
  },
};
