import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { toDateKey, zonedToUtc } from '../utils/timezone';
import { PomodoroInput } from '../validators/misc.validator';

export const pomodoroService = {
  async create(userId: string, input: PomodoroInput) {
    if (input.taskId) {
      const task = await prisma.task.findFirst({ where: { id: input.taskId, userId } });
      if (!task) throw new AppError('Tarefa associada não encontrada.', 422);
    }
    return prisma.pomodoroSession.create({
      data: { ...input, userId },
      include: { task: { select: { id: true, title: true } } },
    });
  },

  list(userId: string, limit: number) {
    return prisma.pomodoroSession.findMany({
      where: { userId },
      include: { task: { select: { id: true, title: true } } },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  },

  async todayStats(userId: string) {
    const startOfToday = zonedToUtc(toDateKey(new Date()), '00:00');
    const sessions = await prisma.pomodoroSession.findMany({
      where: { userId, type: 'FOCUS', completed: true, startedAt: { gte: startOfToday } },
    });
    return {
      focusSessions: sessions.length,
      focusMinutes: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    };
  },
};
