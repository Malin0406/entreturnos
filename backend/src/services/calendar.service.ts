import { Category, CommuteMode } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  BusyBlock,
  Interval,
  commuteInterval,
  expandRecurring,
  findConflicts,
  overlaps,
} from '../domain/scheduling';
import { AppError } from '../utils/AppError';
import { formatBR } from '../utils/timezone';

export type CalendarEventKind = 'APPOINTMENT' | 'RECURRING' | 'COMMUTE';

export interface CalendarEvent {
  id: string;
  sourceId: string;
  kind: CalendarEventKind;
  title: string;
  start: Date;
  end: Date;
  description: string | null;
  location: string | null;
  category: Pick<Category, 'id' | 'slug' | 'name' | 'color'> | null;
  taskId: string | null;
  commute?: { origin: string; destination: string; mode: CommuteMode; durationMinutes: number };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function commuteTitle(origin: string, destination: string) {
  return `Deslocamento: ${origin} → ${destination}`;
}

/**
 * Monta todos os eventos do usuário no período: compromissos únicos, ocorrências
 * de compromissos recorrentes (calculadas, não persistidas) e deslocamentos.
 */
async function getEvents(userId: string, rangeStart: Date, rangeEnd: Date): Promise<CalendarEvent[]> {
  const range: Interval = { start: rangeStart, end: rangeEnd };
  // Margem de 1 dia: um deslocamento pode "vazar" para fora do compromisso âncora.
  const marginStart = new Date(rangeStart.getTime() - DAY_MS);
  const marginEnd = new Date(rangeEnd.getTime() + DAY_MS);

  const [appointments, recurring, standaloneCommutes] = await Promise.all([
    prisma.appointment.findMany({
      where: { userId, startAt: { lt: marginEnd }, endAt: { gt: marginStart } },
      include: { category: true, commutes: true },
      orderBy: { startAt: 'asc' },
    }),
    prisma.recurringAppointment.findMany({
      where: { userId },
      include: { category: true, commutes: true },
    }),
    prisma.commute.findMany({
      where: { userId, startAt: { not: null, lt: marginEnd, gt: new Date(marginStart.getTime() - DAY_MS) } },
    }),
  ]);

  const events: CalendarEvent[] = [];

  for (const appt of appointments) {
    events.push({
      id: appt.id,
      sourceId: appt.id,
      kind: 'APPOINTMENT',
      title: appt.title,
      start: appt.startAt,
      end: appt.endAt,
      description: appt.description,
      location: appt.location,
      category: appt.category,
      taskId: appt.taskId,
    });
    for (const commute of appt.commutes) {
      const interval = commuteInterval(commute, { start: appt.startAt, end: appt.endAt });
      if (!interval) continue;
      events.push({
        id: `${commute.id}:${appt.id}`,
        sourceId: commute.id,
        kind: 'COMMUTE',
        title: commuteTitle(commute.origin, commute.destination),
        ...interval,
        description: `Relacionado a: ${appt.title}`,
        location: null,
        category: null,
        taskId: null,
        commute: commute,
      });
    }
  }

  for (const rule of recurring) {
    for (const occ of expandRecurring(rule, marginStart, marginEnd)) {
      events.push({
        id: occ.occurrenceId,
        sourceId: rule.id,
        kind: 'RECURRING',
        title: rule.title,
        start: occ.start,
        end: occ.end,
        description: rule.description,
        location: rule.location,
        category: rule.category,
        taskId: null,
      });
      for (const commute of rule.commutes) {
        const interval = commuteInterval(commute, occ);
        if (!interval) continue;
        events.push({
          id: `${commute.id}:${occ.dateKey}`,
          sourceId: commute.id,
          kind: 'COMMUTE',
          title: commuteTitle(commute.origin, commute.destination),
          ...interval,
          description: `Relacionado a: ${rule.title}`,
          location: null,
          category: null,
          taskId: null,
          commute: commute,
        });
      }
    }
  }

  for (const commute of standaloneCommutes) {
    const interval = commuteInterval(commute);
    if (!interval) continue;
    events.push({
      id: commute.id,
      sourceId: commute.id,
      kind: 'COMMUTE',
      title: commuteTitle(commute.origin, commute.destination),
      ...interval,
      description: null,
      location: null,
      category: null,
      taskId: null,
      commute: commute,
    });
  }

  return events
    .filter((event) => overlaps(event, range))
    .map((event) => {
      if (!event.commute) return event;
      const { origin, destination, mode, durationMinutes } = event.commute;
      return { ...event, commute: { origin, destination, mode, durationMinutes } };
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

function toBusyBlocks(events: CalendarEvent[]): BusyBlock[] {
  return events.map((e) => ({ start: e.start, end: e.end, kind: e.kind, title: e.title, sourceId: e.sourceId }));
}

async function getBusyBlocks(userId: string, rangeStart: Date, rangeEnd: Date): Promise<BusyBlock[]> {
  return toBusyBlocks(await getEvents(userId, rangeStart, rangeEnd));
}

/**
 * Verifica conflitos para um conjunto de intervalos candidatos.
 * Lança 409 com a lista de conflitos, a menos que "force" seja verdadeiro.
 */
async function assertNoConflicts(
  userId: string,
  candidates: Interval[],
  options: { ignoreSourceIds?: string[]; force?: boolean } = {},
) {
  if (options.force || candidates.length === 0) return;
  const start = new Date(Math.min(...candidates.map((c) => c.start.getTime())));
  const end = new Date(Math.max(...candidates.map((c) => c.end.getTime())));
  const busy = await getBusyBlocks(userId, start, end);

  const conflicts = new Map<string, BusyBlock>();
  for (const candidate of candidates) {
    for (const conflict of findConflicts(candidate, busy, options.ignoreSourceIds)) {
      conflicts.set(`${conflict.sourceId}:${conflict.start.toISOString()}`, conflict);
    }
  }

  if (conflicts.size > 0) {
    const list = Array.from(conflicts.values())
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 10)
      .map((c) => ({ title: c.title, kind: c.kind, start: c.start, end: c.end, label: formatBR(c.start) }));
    throw AppError.conflict('Conflito de horário com outros compromissos.', { conflicts: list });
  }
}

export const calendarService = {
  getEvents,
  getBusyBlocks,
  assertNoConflicts,
};
