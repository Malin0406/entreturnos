import { Router } from 'express';
import { taskController } from '../controllers/task.controller';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { idParam } from '../validators/common';
import {
  createTaskSchema,
  listTasksQuery,
  updateTaskSchema,
  updateTaskStatusSchema,
} from '../validators/task.validator';

export const taskRoutes = Router();

taskRoutes.get('/', validate({ query: listTasksQuery }), asyncHandler(taskController.list));
taskRoutes.post('/', validate({ body: createTaskSchema }), asyncHandler(taskController.create));
taskRoutes.get('/:id', validate({ params: idParam }), asyncHandler(taskController.get));
taskRoutes.put('/:id', validate({ params: idParam, body: updateTaskSchema }), asyncHandler(taskController.update));
taskRoutes.patch(
  '/:id/status',
  validate({ params: idParam, body: updateTaskStatusSchema }),
  asyncHandler(taskController.setStatus),
);
taskRoutes.delete('/:id', validate({ params: idParam }), asyncHandler(taskController.remove));
