import { Request, Response } from 'express';
import { currentUserId } from '../middlewares/auth';
import { taskService } from '../services/task.service';
import { ListTasksQuery } from '../validators/task.validator';

export const taskController = {
  async list(req: Request, res: Response) {
    res.json(await taskService.list(currentUserId(req), req.query as unknown as ListTasksQuery));
  },

  async get(req: Request, res: Response) {
    res.json(await taskService.get(currentUserId(req), req.params.id));
  },

  async create(req: Request, res: Response) {
    res.status(201).json(await taskService.create(currentUserId(req), req.body));
  },

  async update(req: Request, res: Response) {
    res.json(await taskService.update(currentUserId(req), req.params.id, req.body));
  },

  async setStatus(req: Request, res: Response) {
    res.json(await taskService.setStatus(currentUserId(req), req.params.id, req.body.status));
  },

  async remove(req: Request, res: Response) {
    await taskService.remove(currentUserId(req), req.params.id);
    res.status(204).send();
  },
};
