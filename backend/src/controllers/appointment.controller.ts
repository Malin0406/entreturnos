import { Request, Response } from 'express';
import { currentUserId } from '../middlewares/auth';
import { appointmentService, commuteService, recurringService } from '../services/appointment.service';
import { calendarService } from '../services/calendar.service';

interface RangeQuery {
  start: Date;
  end: Date;
}

export const calendarController = {
  async events(req: Request, res: Response) {
    const { start, end } = req.query as unknown as RangeQuery;
    res.json(await calendarService.getEvents(currentUserId(req), start, end));
  },
};

export const appointmentController = {
  async list(req: Request, res: Response) {
    const { start, end } = req.query as unknown as Partial<RangeQuery>;
    const range = start && end ? { start, end } : undefined;
    res.json(await appointmentService.list(currentUserId(req), range));
  },
  async get(req: Request, res: Response) {
    res.json(await appointmentService.get(currentUserId(req), req.params.id));
  },
  async create(req: Request, res: Response) {
    res.status(201).json(await appointmentService.create(currentUserId(req), req.body));
  },
  async update(req: Request, res: Response) {
    res.json(await appointmentService.update(currentUserId(req), req.params.id, req.body));
  },
  async remove(req: Request, res: Response) {
    await appointmentService.remove(currentUserId(req), req.params.id);
    res.status(204).send();
  },
};

export const recurringController = {
  async list(req: Request, res: Response) {
    res.json(await recurringService.list(currentUserId(req)));
  },
  async get(req: Request, res: Response) {
    res.json(await recurringService.get(currentUserId(req), req.params.id));
  },
  async create(req: Request, res: Response) {
    res.status(201).json(await recurringService.create(currentUserId(req), req.body));
  },
  async update(req: Request, res: Response) {
    res.json(await recurringService.update(currentUserId(req), req.params.id, req.body));
  },
  async remove(req: Request, res: Response) {
    await recurringService.remove(currentUserId(req), req.params.id);
    res.status(204).send();
  },
};

export const commuteController = {
  async list(req: Request, res: Response) {
    res.json(await commuteService.list(currentUserId(req)));
  },
  async get(req: Request, res: Response) {
    res.json(await commuteService.get(currentUserId(req), req.params.id));
  },
  async create(req: Request, res: Response) {
    res.status(201).json(await commuteService.create(currentUserId(req), req.body));
  },
  async update(req: Request, res: Response) {
    res.json(await commuteService.update(currentUserId(req), req.params.id, req.body));
  },
  async remove(req: Request, res: Response) {
    await commuteService.remove(currentUserId(req), req.params.id);
    res.status(204).send();
  },
};
