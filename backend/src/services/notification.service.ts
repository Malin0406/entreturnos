import { NotificationType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { formatBR, toLocalTime } from '../utils/timezone';
import { calendarService } from './calendar.service';
import { preferenceService } from './user.service';

interface NotificationDraft {
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  dedupeKey: string;
}

export const notificationService = {
  /**
   * Gera notificações a partir do estado atual (prazos e compromissos próximos),
   * respeitando as preferências do usuário. A chave de deduplicação evita repetições.
   */
  async refresh(userId: string, now = new Date()) {
    const pref = await preferenceService.get(userId);
    const drafts: NotificationDraft[] = [];

    if (pref.notifyTaskDeadlines) {
      const alertLimit = new Date(now.getTime() + pref.deadlineAlertHours * 3_600_000);
      const tasks = await prisma.task.findMany({
        where: { userId, status: { not: 'COMPLETED' }, dueDate: { not: null, lte: alertLimit } },
      });
      for (const task of tasks) {
        const due = task.dueDate as Date;
        if (due < now) {
          drafts.push({
            type: 'TASK_OVERDUE',
            title: 'Tarefa atrasada',
            message: `"${task.title}" venceu em ${formatBR(due)}.`,
            link: '/tarefas',
            dedupeKey: `overdue:${task.id}:${due.toISOString()}`,
          });
        } else {
          drafts.push({
            type: 'TASK_DUE_SOON',
            title: 'Prazo se aproximando',
            message: `"${task.title}" vence em ${formatBR(due)}.`,
            link: '/tarefas',
            dedupeKey: `due:${task.id}:${due.toISOString()}`,
          });
        }
      }
    }

    if (pref.notifyAppointments) {
      const limit = new Date(now.getTime() + pref.appointmentAlertMinutes * 60_000);
      const events = await calendarService.getEvents(userId, now, limit);
      for (const event of events) {
        if (event.kind === 'COMMUTE' || event.start < now) continue;
        drafts.push({
          type: 'APPOINTMENT_SOON',
          title: 'Compromisso em breve',
          message: `${event.title} começa às ${toLocalTime(event.start)}.`,
          link: '/agenda',
          dedupeKey: `appt:${event.id}:${event.start.toISOString()}`,
        });
      }
    }

    if (drafts.length > 0) {
      await prisma.notification.createMany({
        data: drafts.map((d) => ({ ...d, userId })),
        skipDuplicates: true,
      });
    }
  },

  async list(userId: string) {
    await this.refresh(userId);
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);
    return { items, unread };
  },

  async markRead(userId: string, id: string) {
    const notification = await prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw AppError.notFound('Notificação');
    return prisma.notification.update({ where: { id }, data: { read: true } });
  },

  async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return { updated: result.count };
  },

  async remove(userId: string, id: string) {
    const notification = await prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw AppError.notFound('Notificação');
    await prisma.notification.delete({ where: { id } });
  },
};
