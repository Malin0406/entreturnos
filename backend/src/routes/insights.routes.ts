import { Router } from 'express';
import {
  dashboardController,
  notificationController,
  planningController,
  pomodoroController,
  reportController,
} from '../controllers/insights.controller';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { idParam } from '../validators/common';
import { planningQuery, pomodoroListQuery, pomodoroSchema, reportsQuery } from '../validators/misc.validator';

export const planningRoutes = Router();
planningRoutes.get('/free-slots', validate({ query: planningQuery }), asyncHandler(planningController.freeSlots));
planningRoutes.get('/suggestions', asyncHandler(planningController.listSuggestions));
planningRoutes.post('/suggestions/generate', asyncHandler(planningController.generate));
planningRoutes.post('/suggestions/:id/accept', validate({ params: idParam }), asyncHandler(planningController.accept));
planningRoutes.post('/suggestions/:id/reject', validate({ params: idParam }), asyncHandler(planningController.reject));

export const pomodoroRoutes = Router();
pomodoroRoutes.get('/', validate({ query: pomodoroListQuery }), asyncHandler(pomodoroController.list));
pomodoroRoutes.get('/today', asyncHandler(pomodoroController.today));
pomodoroRoutes.post('/', validate({ body: pomodoroSchema }), asyncHandler(pomodoroController.create));

export const notificationRoutes = Router();
notificationRoutes.get('/', asyncHandler(notificationController.list));
notificationRoutes.patch('/read-all', asyncHandler(notificationController.markAllRead));
notificationRoutes.patch('/:id/read', validate({ params: idParam }), asyncHandler(notificationController.markRead));
notificationRoutes.delete('/:id', validate({ params: idParam }), asyncHandler(notificationController.remove));

export const reportRoutes = Router();
reportRoutes.get('/summary', validate({ query: reportsQuery }), asyncHandler(reportController.summary));

export const dashboardRoutes = Router();
dashboardRoutes.get('/', asyncHandler(dashboardController.overview));
