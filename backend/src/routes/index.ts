import { Router } from 'express';
import { ensureAuthenticated } from '../middlewares/auth';
import {
  appointmentRoutes,
  calendarRoutes,
  commuteRoutes,
  recurringRoutes,
} from './appointment.routes';
import { authRoutes } from './auth.routes';
import {
  dashboardRoutes,
  notificationRoutes,
  planningRoutes,
  pomodoroRoutes,
  reportRoutes,
} from './insights.routes';
import { taskRoutes } from './task.routes';
import { categoryRoutes, preferenceRoutes, userRoutes } from './user.routes';

export const routes = Router();

routes.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

routes.use('/auth', authRoutes);

// Todas as rotas abaixo exigem autenticação.
routes.use(ensureAuthenticated);
routes.use('/users', userRoutes);
routes.use('/preferences', preferenceRoutes);
routes.use('/categories', categoryRoutes);
routes.use('/tasks', taskRoutes);
routes.use('/calendar', calendarRoutes);
routes.use('/appointments', appointmentRoutes);
routes.use('/recurring-appointments', recurringRoutes);
routes.use('/commutes', commuteRoutes);
routes.use('/planning', planningRoutes);
routes.use('/pomodoro-sessions', pomodoroRoutes);
routes.use('/notifications', notificationRoutes);
routes.use('/reports', reportRoutes);
routes.use('/dashboard', dashboardRoutes);
