import { z } from 'zod';
import { isoDateTime, optionalText, uuid } from './common';

const priority = z.enum(['LOW', 'MEDIUM', 'HIGH']);
const status = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']);

const baseTask = z.object({
  title: z.string().trim().min(1, 'Informe o título.').max(150),
  description: optionalText(2000),
  categoryId: uuid,
  dueDate: isoDateTime.nullable().optional(),
  estimatedMinutes: z.number().int().min(5, 'Mínimo de 5 minutos.').max(1440, 'Máximo de 24 horas.'),
  priority: priority.default('MEDIUM'),
  status: status.default('PENDING'),
});

export const createTaskSchema = baseTask;

export const updateTaskSchema = baseTask.partial();

export const updateTaskStatusSchema = z.object({ status });

export const listTasksQuery = z.object({
  status: status.optional(),
  priority: priority.optional(),
  categoryId: uuid.optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(['dueDate', 'createdAt', 'priority']).default('dueDate'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuery>;
