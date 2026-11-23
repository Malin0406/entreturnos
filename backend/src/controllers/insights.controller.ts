import { Request, Response } from 'express';
import { currentUserId } from '../middlewares/auth';
import { dashboardService } from '../services/dashboard.service';
import { notificationService } from '../services/notification.service';
import { planningService } from '../services/planning.service';
import { pomodoroService } from '../services/pomodoro.service';
import { reportService } from '../services/report.service';

export const planningController = {
  async freeSlots(req: Request, res: Response) {
    const { start, days } = req.query as { start?: string; days?: number };
    res.json(await planningService.freeSlotsReport(currentUserId(req), start, days));
  },
  async listSuggestions(req: Request, res: Response) {
    res.json(await planningService.list(currentUserId(req)));
  },
  async generate(req: Request, res: Response) {
    res.json(await planningService.generate(currentUserId(req)));
  },
  async accept(req: Request, res: Response) {
    res.json(await planningService.accept(currentUserId(req), req.params.id));
  },
  async reject(req: Request, res: Response) {
    res.json(await planningService.reject(currentUserId(req), req.params.id));
  },
};

export const pomodoroController = {
  async create(req: Request, res: Response) {
    res.status(201).json(await pomodoroService.create(currentUserId(req), req.body));
  },
  async list(req: Request, res: Response) {
    const { limit } = req.query as unknown as { limit: number };
    res.json(await pomodoroService.list(currentUserId(req), limit));
  },
  async today(req: Request, res: Response) {
    res.json(await pomodoroService.todayStats(currentUserId(req)));
  },
};

export const notificationController = {
  async list(req: Request, res: Response) {
    res.json(await notificationService.list(currentUserId(req)));
  },
  async markRead(req: Request, res: Response) {
    res.json(await notificationService.markRead(currentUserId(req), req.params.id));
  },
  async markAllRead(req: Request, res: Response) {
    res.json(await notificationService.markAllRead(currentUserId(req)));
  },
  async remove(req: Request, res: Response) {
    await notificationService.remove(currentUserId(req), req.params.id);
    res.status(204).send();
  },
};

export const reportController = {
  async summary(req: Request, res: Response) {
    const { weeks } = req.query as unknown as { weeks: number };
    res.json(await reportService.summary(currentUserId(req), weeks));
  },
};

export const dashboardController = {
  async overview(req: Request, res: Response) {
    res.json(await dashboardService.overview(currentUserId(req)));
  },
};
