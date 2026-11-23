import { prisma } from '../config/prisma';
import {
  DateKey,
  addDaysToKey,
  diffMinutes,
  startOfWeekKey,
  toDateKey,
  zonedToUtc,
} from '../utils/timezone';
import { CalendarEvent, calendarService } from './calendar.service';
import { STUDY_SLUGS, WORK_SLUGS, categoryService } from './category.service';

interface WeekBucket {
  weekStart: DateKey;
  label: string;
  completedTasks: number;
  dueTasks: number;
  focusSessions: number;
  focusMinutes: number;
  studyMinutes: number;
  workMinutes: number;
  completionRate: number;
}

function weekLabel(weekStart: DateKey) {
  const [, month, day] = weekStart.split('-');
  return `${day}/${month}`;
}

/** Minutos de um evento que já transcorreram até "now" (tempo efetivamente dedicado). */
function elapsedMinutes(event: CalendarEvent, now: Date) {
  const end = event.end < now ? event.end : now;
  return Math.max(0, diffMinutes(end, event.start));
}

export const reportService = {
  async summary(userId: string, weeks: number, now = new Date()) {
    const currentWeek = startOfWeekKey(toDateKey(now));
    const firstWeek = addDaysToKey(currentWeek, -7 * (weeks - 1));
    const rangeStart = zonedToUtc(firstWeek, '00:00');
    const rangeEnd = zonedToUtc(addDaysToKey(currentWeek, 7), '00:00');

    const [completed, dueInRange, sessions, events, statusCounts, categories, tasksByCategory] = await Promise.all([
      prisma.task.findMany({
        where: { userId, status: 'COMPLETED', completedAt: { gte: rangeStart, lt: rangeEnd } },
        select: { completedAt: true },
      }),
      prisma.task.findMany({
        where: { userId, dueDate: { gte: rangeStart, lt: rangeEnd } },
        select: { dueDate: true },
      }),
      prisma.pomodoroSession.findMany({
        where: { userId, type: 'FOCUS', completed: true, startedAt: { gte: rangeStart, lt: rangeEnd } },
        include: { task: { include: { category: true } } },
      }),
      calendarService.getEvents(userId, rangeStart, now < rangeEnd ? now : rangeEnd),
      prisma.task.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),
      categoryService.list(),
      prisma.task.groupBy({ by: ['categoryId'], where: { userId }, _count: { _all: true } }),
    ]);

    const buckets = new Map<DateKey, WeekBucket>();
    for (let i = 0; i < weeks; i++) {
      const weekStart = addDaysToKey(firstWeek, i * 7);
      buckets.set(weekStart, {
        weekStart,
        label: weekLabel(weekStart),
        completedTasks: 0,
        dueTasks: 0,
        focusSessions: 0,
        focusMinutes: 0,
        studyMinutes: 0,
        workMinutes: 0,
        completionRate: 0,
      });
    }
    const bucketOf = (date: Date) => buckets.get(startOfWeekKey(toDateKey(date)));

    for (const task of completed) {
      const bucket = task.completedAt && bucketOf(task.completedAt);
      if (bucket) bucket.completedTasks++;
    }
    for (const task of dueInRange) {
      const bucket = task.dueDate && bucketOf(task.dueDate);
      if (bucket) bucket.dueTasks++;
    }

    const categoryMinutes = new Map<string, number>();
    const addCategoryMinutes = (slug: string, minutes: number) =>
      categoryMinutes.set(slug, (categoryMinutes.get(slug) ?? 0) + minutes);

    for (const session of sessions) {
      const bucket = bucketOf(session.startedAt);
      if (!bucket) continue;
      bucket.focusSessions++;
      bucket.focusMinutes += session.durationMinutes;
    }

    let commuteMinutes = 0;
    for (const event of events) {
      const minutes = elapsedMinutes(event, now);
      if (minutes <= 0) continue;
      if (event.kind === 'COMMUTE') {
        commuteMinutes += minutes;
        continue;
      }
      const slug = event.category?.slug ?? 'outros';
      addCategoryMinutes(slug, minutes);
      const bucket = bucketOf(event.start);
      if (!bucket) continue;
      if (STUDY_SLUGS.includes(slug)) bucket.studyMinutes += minutes;
      if (WORK_SLUGS.includes(slug)) bucket.workMinutes += minutes;
    }

    const weekly = Array.from(buckets.values()).map((bucket) => {
      const base = Math.max(bucket.dueTasks, bucket.completedTasks);
      return { ...bucket, completionRate: base === 0 ? 0 : Math.round((bucket.completedTasks / base) * 100) };
    });

    const count = (status: string) => statusCounts.find((s) => s.status === status)?._count._all ?? 0;
    const overdue = await prisma.task.count({
      where: { userId, status: { not: 'COMPLETED' }, dueDate: { lt: now } },
    });

    const categoryDistribution = categories
      .map((category) => ({
        slug: category.slug,
        name: category.name,
        color: category.color,
        minutes: categoryMinutes.get(category.slug) ?? 0,
        tasks: tasksByCategory.find((t) => t.categoryId === category.id)?._count._all ?? 0,
      }))
      .filter((c) => c.minutes > 0 || c.tasks > 0);

    const sum = (key: keyof Pick<WeekBucket, 'focusMinutes' | 'focusSessions' | 'studyMinutes' | 'workMinutes' | 'completedTasks'>) =>
      weekly.reduce((acc, w) => acc + w[key], 0);

    return {
      period: { start: rangeStart, end: rangeEnd, weeks },
      totals: {
        pending: count('PENDING'),
        inProgress: count('IN_PROGRESS'),
        completed: count('COMPLETED'),
        overdue,
        completedInPeriod: sum('completedTasks'),
        focusSessions: sum('focusSessions'),
        focusMinutes: sum('focusMinutes'),
        studyMinutes: sum('studyMinutes'),
        workMinutes: sum('workMinutes'),
        commuteMinutes,
      },
      weekly,
      categoryDistribution,
    };
  },
};
