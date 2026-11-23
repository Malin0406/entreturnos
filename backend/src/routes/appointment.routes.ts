import { Router } from 'express';
import { z } from 'zod';
import {
  appointmentController,
  calendarController,
  commuteController,
  recurringController,
} from '../controllers/appointment.controller';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { appointmentSchema, commuteSchema, recurringSchema } from '../validators/appointment.validator';
import { idParam, isoDateTime, rangeQuery } from '../validators/common';

const optionalRange = z.object({ start: isoDateTime.optional(), end: isoDateTime.optional() });

export const calendarRoutes = Router();
calendarRoutes.get('/events', validate({ query: rangeQuery }), asyncHandler(calendarController.events));

export const appointmentRoutes = Router();
appointmentRoutes.get('/', validate({ query: optionalRange }), asyncHandler(appointmentController.list));
appointmentRoutes.post('/', validate({ body: appointmentSchema }), asyncHandler(appointmentController.create));
appointmentRoutes.get('/:id', validate({ params: idParam }), asyncHandler(appointmentController.get));
appointmentRoutes.put(
  '/:id',
  validate({ params: idParam, body: appointmentSchema }),
  asyncHandler(appointmentController.update),
);
appointmentRoutes.delete('/:id', validate({ params: idParam }), asyncHandler(appointmentController.remove));

export const recurringRoutes = Router();
recurringRoutes.get('/', asyncHandler(recurringController.list));
recurringRoutes.post('/', validate({ body: recurringSchema }), asyncHandler(recurringController.create));
recurringRoutes.get('/:id', validate({ params: idParam }), asyncHandler(recurringController.get));
recurringRoutes.put('/:id', validate({ params: idParam, body: recurringSchema }), asyncHandler(recurringController.update));
recurringRoutes.delete('/:id', validate({ params: idParam }), asyncHandler(recurringController.remove));

export const commuteRoutes = Router();
commuteRoutes.get('/', asyncHandler(commuteController.list));
commuteRoutes.post('/', validate({ body: commuteSchema }), asyncHandler(commuteController.create));
commuteRoutes.get('/:id', validate({ params: idParam }), asyncHandler(commuteController.get));
commuteRoutes.put('/:id', validate({ params: idParam, body: commuteSchema }), asyncHandler(commuteController.update));
commuteRoutes.delete('/:id', validate({ params: idParam }), asyncHandler(commuteController.remove));
