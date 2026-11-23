import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { ensureAuthenticated } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

export const authRoutes = Router();

authRoutes.post('/register', validate({ body: registerSchema }), asyncHandler(authController.register));
authRoutes.post('/login', validate({ body: loginSchema }), asyncHandler(authController.login));
authRoutes.post('/forgot-password', validate({ body: forgotPasswordSchema }), asyncHandler(authController.forgotPassword));
authRoutes.post('/reset-password', validate({ body: resetPasswordSchema }), asyncHandler(authController.resetPassword));
authRoutes.get('/me', ensureAuthenticated, asyncHandler(authController.me));
