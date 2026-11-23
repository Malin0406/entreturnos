import { Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from '../validators/task.validator';
import { categoryService } from './category.service';

const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

const include = { category: true } satisfies Prisma.TaskInclude;

function completedAtFor(status: TaskStatus | undefined, previous?: TaskStatus) {
  if (status === undefined) return undefined;
  if (status === 'COMPLETED') return previous === 'COMPLETED' ? undefined : new Date();
  return null;
}

async function findOwned(userId: string, id: string) {
  const task = await prisma.task.findFirst({ where: { id, userId }, include });
  if (!task) throw AppError.notFound('Tarefa');
  return task;
}

export const taskService = {
  async list(userId: string, query: ListTasksQuery) {
    const where: Prisma.TaskWhereInput = {
      userId,
      status: query.status,
      priority: query.priority,
      categoryId: query.categoryId,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const tasks = await prisma.task.findMany({
      where,
      include,
      orderBy:
        query.sort === 'createdAt'
          ? { createdAt: query.order }
          : query.sort === 'dueDate'
            ? [{ dueDate: { sort: query.order, nulls: 'last' } }, { createdAt: 'desc' }]
            : { createdAt: 'desc' },
    });

    if (query.sort === 'priority') {
      const direction = query.order === 'asc' ? 1 : -1;
      tasks.sort((a, b) => (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) * direction);
    }
    return tasks;
  },

  get: findOwned,

  async create(userId: string, input: CreateTaskInput) {
    await categoryService.assertExists(input.categoryId);
    return prisma.task.create({
      data: {
        userId,
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
        dueDate: input.dueDate ?? null,
        estimatedMinutes: input.estimatedMinutes,
        priority: input.priority,
        status: input.status,
        completedAt: input.status === 'COMPLETED' ? new Date() : null,
      },
      include,
    });
  },

  async update(userId: string, id: string, input: UpdateTaskInput) {
    const current = await findOwned(userId, id);
    if (input.categoryId) await categoryService.assertExists(input.categoryId);

    const task = await prisma.task.update({
      where: { id: current.id },
      data: { ...input, completedAt: completedAtFor(input.status, current.status) },
      include,
    });

    // Tarefa concluída não precisa mais de sugestões pendentes.
    if (task.status === 'COMPLETED') {
      await prisma.scheduleSuggestion.deleteMany({ where: { taskId: task.id, status: 'PENDING' } });
    }
    return task;
  },

  async setStatus(userId: string, id: string, status: TaskStatus) {
    return this.update(userId, id, { status });
  },

  async remove(userId: string, id: string) {
    const task = await findOwned(userId, id);
    await prisma.task.delete({ where: { id: task.id } });
  },
};
