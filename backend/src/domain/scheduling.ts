/**
 * Núcleo de regras de negócio do planejamento inteligente.
 * Funções puras (sem acesso ao banco), facilitando testes unitários.
 */
import {
  DateKey,
  addDaysToKey,
  addMinutes,
  diffMinutes,
  formatBR,
  toLocalTime,
  weekdayOf,
  zonedToUtc,
} from '../utils/timezone';

export interface Interval {
  start: Date;
  end: Date;
}

export type BusyKind = 'APPOINTMENT' | 'RECURRING' | 'COMMUTE';

export interface BusyBlock extends Interval {
  kind: BusyKind;
  title: string;
  sourceId: string;
}

export interface RecurringRule {
  id: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  startDate: DateKey;
  endDate: DateKey | null;
}

export interface Occurrence extends Interval {
  occurrenceId: string;
  dateKey: DateKey;
}

export interface AvailabilityPreferences {
  availabilityStart: string;
  availabilityEnd: string;
  availableWeekdays: number[];
  breakMinutes: number;
  minSlotMinutes: number;
  maxTaskBlockMinutes: number;
}

export interface FreeSlot extends Interval {
  dateKey: DateKey;
  minutes: number;
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SchedulableTask {
  id: string;
  title: string;
  priority: Priority;
  dueDate: Date | null;
  estimatedMinutes: number;
  /** Minutos já reservados em compromissos futuros aceitos para essa tarefa. */
  scheduledMinutes: number;
  /** Intervalos que o usuário recusou para esta tarefa (não serão sugeridos novamente). */
  blocked?: Interval[];
}

export interface SuggestionDraft extends Interval {
  taskId: string;
  score: number;
  reason: string;
}

const PRIORITY_WEIGHT: Record<Priority, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const PRIORITY_LABEL: Record<Priority, string> = { HIGH: 'alta', MEDIUM: 'média', LOW: 'baixa' };

/* ------------------------------------------------------------------ */
/* Intervalos                                                          */
/* ------------------------------------------------------------------ */

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

/** Une intervalos sobrepostos ou encostados. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals
    .filter((i) => i.end.getTime() > i.start.getTime())
    .map((i) => ({ start: new Date(i.start), end: new Date(i.end) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: Interval[] = [];
  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (last && current.start.getTime() <= last.end.getTime()) {
      if (current.end.getTime() > last.end.getTime()) last.end = current.end;
    } else {
      merged.push(current);
    }
  }
  return merged;
}

/** Retorna as partes de "window" que não são cobertas por "busy". */
export function subtractIntervals(window: Interval, busy: Interval[]): Interval[] {
  const result: Interval[] = [];
  let cursor = window.start.getTime();
  const windowEnd = window.end.getTime();

  for (const block of mergeIntervals(busy)) {
    const blockStart = block.start.getTime();
    const blockEnd = block.end.getTime();
    if (blockEnd <= cursor) continue;
    if (blockStart >= windowEnd) break;
    if (blockStart > cursor) result.push({ start: new Date(cursor), end: new Date(blockStart) });
    cursor = Math.max(cursor, blockEnd);
  }
  if (cursor < windowEnd) result.push({ start: new Date(cursor), end: new Date(windowEnd) });
  return result;
}

/** Retorna os bloqueios que conflitam com o intervalo candidato. */
export function findConflicts(
  candidate: Interval,
  busy: BusyBlock[],
  ignoreSourceIds: string[] = [],
): BusyBlock[] {
  return busy.filter((block) => !ignoreSourceIds.includes(block.sourceId) && overlaps(candidate, block));
}

/* ------------------------------------------------------------------ */
/* Recorrência e deslocamentos                                         */
/* ------------------------------------------------------------------ */

/**
 * Gera as ocorrências de uma regra recorrente dentro do intervalo informado.
 * As ocorrências são calculadas em memória — nada é duplicado no banco.
 */
export function expandRecurring(rule: RecurringRule, rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const occurrences: Occurrence[] = [];
  // Margem de um dia para cobrir diferenças de fuso nas bordas.
  let key = addDaysToKey(rangeStart.toISOString().slice(0, 10), -1);
  const lastKey = addDaysToKey(rangeEnd.toISOString().slice(0, 10), 1);

  while (key <= lastKey) {
    const withinRule = key >= rule.startDate && (!rule.endDate || key <= rule.endDate);
    if (withinRule && rule.weekdays.includes(weekdayOf(key))) {
      const start = zonedToUtc(key, rule.startTime);
      const end = zonedToUtc(key, rule.endTime);
      const occurrence = { start, end };
      if (overlaps(occurrence, { start: rangeStart, end: rangeEnd })) {
        occurrences.push({ occurrenceId: `${rule.id}:${key}`, dateKey: key, start, end });
      }
    }
    key = addDaysToKey(key, 1);
  }
  return occurrences;
}

export interface CommuteRule {
  durationMinutes: number;
  position: 'BEFORE' | 'AFTER';
  startAt: Date | null;
}

/** Calcula o intervalo ocupado por um deslocamento em relação ao compromisso âncora. */
export function commuteInterval(commute: CommuteRule, anchor?: Interval): Interval | null {
  if (anchor) {
    if (commute.position === 'BEFORE') {
      return { start: addMinutes(anchor.start, -commute.durationMinutes), end: anchor.start };
    }
    return { start: anchor.end, end: addMinutes(anchor.end, commute.durationMinutes) };
  }
  if (commute.startAt) {
    return { start: commute.startAt, end: addMinutes(commute.startAt, commute.durationMinutes) };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Horários livres                                                     */
/* ------------------------------------------------------------------ */

function roundUpTo5Minutes(date: Date): Date {
  const step = 5 * 60_000;
  return new Date(Math.ceil(date.getTime() / step) * step);
}

/**
 * Identifica horários livres dentro da disponibilidade configurada pelo usuário,
 * descontando compromissos, deslocamentos e uma pausa de descanso ao redor de cada bloqueio.
 */
export function computeFreeSlots(params: {
  dateKeys: DateKey[];
  busy: Interval[];
  preferences: AvailabilityPreferences;
  now: Date;
}): FreeSlot[] {
  const { dateKeys, busy, preferences, now } = params;
  const pause = preferences.breakMinutes;
  const buffered = busy.map((b) => ({ start: addMinutes(b.start, -pause), end: addMinutes(b.end, pause) }));
  const earliest = roundUpTo5Minutes(now);
  const slots: FreeSlot[] = [];

  for (const dateKey of dateKeys) {
    if (!preferences.availableWeekdays.includes(weekdayOf(dateKey))) continue;

    const windowStart = zonedToUtc(dateKey, preferences.availabilityStart);
    const windowEnd = zonedToUtc(dateKey, preferences.availabilityEnd);
    const start = windowStart.getTime() < earliest.getTime() ? earliest : windowStart;
    if (start.getTime() >= windowEnd.getTime()) continue;

    for (const free of subtractIntervals({ start, end: windowEnd }, buffered)) {
      const minutes = diffMinutes(free.end, free.start);
      if (minutes >= preferences.minSlotMinutes) {
        slots.push({ ...free, dateKey, minutes });
      }
    }
  }
  return slots;
}

/* ------------------------------------------------------------------ */
/* Sugestões                                                           */
/* ------------------------------------------------------------------ */

/** Pontuação da tarefa: prioridade + urgência do prazo. */
export function taskScore(task: Pick<SchedulableTask, 'priority' | 'dueDate'>, now: Date): number {
  let score = PRIORITY_WEIGHT[task.priority] * 10;
  if (task.dueDate) {
    const hoursLeft = (task.dueDate.getTime() - now.getTime()) / 3_600_000;
    if (hoursLeft < 0) score += 30;
    else if (hoursLeft <= 24) score += 20;
    else if (hoursLeft <= 72) score += 12;
    else if (hoursLeft <= 168) score += 5;
  }
  return score;
}

function describeDeadline(dueDate: Date | null, now: Date): string {
  if (!dueDate) return 'sem prazo definido';
  const hoursLeft = (dueDate.getTime() - now.getTime()) / 3_600_000;
  if (hoursLeft < 0) return 'tarefa atrasada';
  if (hoursLeft <= 24) return `prazo em menos de 24h (${formatBR(dueDate)})`;
  const days = Math.ceil(hoursLeft / 24);
  return `prazo em ${days} dia${days > 1 ? 's' : ''} (${formatBR(dueDate, 'dd/MM')})`;
}

/**
 * Distribui as tarefas pendentes nos horários livres (algoritmo guloso por pontuação).
 * Regras: nunca usa horário ocupado, respeita pausas entre blocos, o tamanho máximo de bloco,
 * a duração estimada e, quando possível, o prazo de entrega.
 */
export function generateSuggestions(params: {
  tasks: SchedulableTask[];
  freeSlots: FreeSlot[];
  preferences: AvailabilityPreferences;
  now: Date;
}): SuggestionDraft[] {
  const { tasks, preferences, now } = params;
  const slots = params.freeSlots
    .map((s) => ({ start: new Date(s.start), end: new Date(s.end) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const ranked = tasks
    .map((task) => ({ task, score: taskScore(task, now), remaining: task.estimatedMinutes - task.scheduledMinutes }))
    .filter((t) => t.remaining > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aDue = a.task.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bDue = b.task.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (aDue !== bDue) return aDue - bDue;
      return a.remaining - b.remaining;
    });

  const suggestions: SuggestionDraft[] = [];

  for (const item of ranked) {
    const { task, score } = item;
    let remaining = item.remaining;
    const overdue = !!task.dueDate && task.dueDate.getTime() < now.getTime();
    const minChunk = Math.min(remaining, preferences.minSlotMinutes);

    const blocked = task.blocked ?? [];

    for (let index = 0; index < slots.length && remaining > 0; index++) {
      const slot = slots[index];
      const slotEnd = !overdue && task.dueDate && task.dueDate < slot.end ? task.dueDate : slot.end;

      // Pula intervalos recusados anteriormente para esta tarefa.
      let candidateStart = new Date(slot.start);
      let moved = true;
      while (moved) {
        moved = false;
        for (const b of blocked) {
          const probe = { start: candidateStart, end: addMinutes(candidateStart, Math.min(remaining, preferences.maxTaskBlockMinutes)) };
          if (overlaps(probe, b)) {
            candidateStart = new Date(b.end);
            moved = true;
          }
        }
      }

      const available = diffMinutes(slotEnd, candidateStart);
      if (available < minChunk) continue;

      const chunk = Math.min(remaining, available, preferences.maxTaskBlockMinutes);
      if (chunk < remaining && chunk < preferences.minSlotMinutes) continue;
      if (blocked.some((b) => overlaps({ start: candidateStart, end: addMinutes(candidateStart, chunk) }, b))) continue;

      const start = candidateStart;
      const end = addMinutes(start, chunk);
      const slotLength = diffMinutes(slot.end, slot.start);
      const partial = chunk < item.remaining ? ` · bloco de ${chunk} de ${item.remaining} min` : '';

      suggestions.push({
        taskId: task.id,
        start,
        end,
        score,
        reason:
          `Prioridade ${PRIORITY_LABEL[task.priority]} · ${describeDeadline(task.dueDate, now)} · ` +
          `encaixa no intervalo livre de ${toLocalTime(slot.start)} às ${toLocalTime(slot.end)} (${slotLength} min)${partial}`,
      });

      remaining -= chunk;
      // Consome o intervalo usado, reservando a pausa de descanso após o bloco.
      slot.start = addMinutes(end, preferences.breakMinutes);
      // Reavalia o mesmo intervalo: ele ainda pode comportar outro bloco da tarefa.
      if (remaining > 0) index--;
    }

    // Remove intervalos que ficaram pequenos demais.
    for (let i = slots.length - 1; i >= 0; i--) {
      if (diffMinutes(slots[i].end, slots[i].start) < preferences.minSlotMinutes) slots.splice(i, 1);
    }
  }

  return suggestions.sort((a, b) => a.start.getTime() - b.start.getTime());
}
