import { prisma } from '../config/prisma';
import { taskScore } from '../domain/scheduling';
import { addDaysToKey, diffMinutes, startOfWeekKey, toDateKey, zonedToUtc } from '../utils/timezone';
import { calendarService } from './calendar.service';
import { STUDY_SLUGS } from './category.service';
import { planningService } from './planning.service';

export const dashboardService = {
  async overview(userId: string, now = new Date()) {
    const todayKey = toDateKey(now);
    const weekStartKey = startOfWeekKey(todayKey);
    const weekStart = zonedToUtc(weekStartKey, '00:00');
    const weekEnd = zonedToUtc(addDaysToKey(weekStartKey, 7), '00:00');
    const todayStart = zonedToUtc(todayKey, '00:00');
    const todayEnd = zonedToUtc(addDaysToKey(todayKey, 1), '00:00');
    const daysLeftInWeek = Math.round((weekEnd.getTime() - todayStart.getTime()) / 86_400_000);

    const [openTasks, completedCount, completedThisWeek, weekEvents, upcomingEvents, focusSessions, pendingSuggestions, unread] =
      await Promise.all([
        prisma.task.findMany({ where: { userId, status: { not: 'COMPLETED' } }, include: { category: true } }),
        prisma.task.count({ where: { userId, status: 'COMPLETED' } }),
        prisma.task.findMany({
          where: { userId, status: 'COMPLETED', completedAt: { gte: weekStart, lt: weekEnd } },
          select: { completedAt: true },
        }),
        calendarService.getEvents(userId, weekStart, weekEnd),
        calendarService.getEvents(userId, now, new Date(now.getTime() + 7 * 86_400_000)),
        prisma.pomodoroSession.findMany({
          where: { userId, type: 'FOCUS', completed: true, startedAt: { gte: weekStart, lt: weekEnd } },
          select: { startedAt: true, durationMinutes: true },
        }),
        prisma.scheduleSuggestion.count({ where: { userId, status: 'PENDING', startAt: { gte: now } } }),
        prisma.notification.count({ where: { userId, read: false } }),
      ]);

    const { slots: weekSlots } = await planningService.getFreeSlots(userId, todayKey, daysLeftInWeek, now);
    const todaySlots = weekSlots.filter((s) => s.dateKey === todayKey);

    const studyMinutesWeek = weekEvents
      .filter((e) => e.kind !== 'COMMUTE' && e.category && STUDY_SLUGS.includes(e.category.slug))
      .reduce((sum, e) => sum + diffMinutes(e.end, e.start), 0);

    const dueThisWeekOpen = openTasks.filter((t) => t.dueDate && t.dueDate < weekEnd).length;
    const progressBase = completedThisWeek.length + dueThisWeekOpen;
    const weeklyProgress = progressBase === 0 ? 0 : Math.round((completedThisWeek.length / progressBase) * 100);

    const weeklyChart = Array.from({ length: 7 }, (_, i) => {
      const dateKey = addDaysToKey(weekStartKey, i);
      return {
        dateKey,
        completed: completedThisWeek.filter((t) => t.completedAt && toDateKey(t.completedAt) === dateKey).length,
        focusMinutes: focusSessions
          .filter((s) => toDateKey(s.startedAt) === dateKey)
          .reduce((sum, s) => sum + s.durationMinutes, 0),
      };
    });

    const priorityTasks = openTasks
      .map((task) => ({ ...task, score: taskScore(task, now) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      counts: {
        pending: openTasks.filter((t) => t.status === 'PENDING').length,
        inProgress: openTasks.filter((t) => t.status === 'IN_PROGRESS').length,
        completed: completedCount,
        overdue: openTasks.filter((t) => t.dueDate && t.dueDate < now).length,
        completedThisWeek: completedThisWeek.length,
      },
      todayEvents: weekEvents.filter((e) => e.end > todayStart && e.start < todayEnd),
      upcomingEvents: upcomingEvents.filter((e) => e.kind !== 'COMMUTE').slice(0, 5),
      priorityTasks,
      studyMinutesWeek,
      freeTime: {
        today: planningService.summarizeSlots(todaySlots),
        week: planningService.summarizeSlots(weekSlots),
        todaySlots,
      },
      weeklyProgress,
      weeklyChart,
      focusMinutesWeek: focusSessions.reduce((sum, s) => sum + s.durationMinutes, 0),
      pendingSuggestions,
      unreadNotifications: unread,
      eventDays: Array.from(new Set(weekEvents.filter((e) => e.kind !== 'COMMUTE').map((e) => toDateKey(e.start)))),
    };
  },
};
