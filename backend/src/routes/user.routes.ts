import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { changePasswordSchema, updatePreferencesSchema, updateProfileSchema } from '../validators/user.validator';

export const userRoutes = Router();

userRoutes.put('/me', validate({ body: updateProfileSchema }), asyncHandler(userController.updateProfile));
userRoutes.put('/me/password', validate({ body: changePasswordSchema }), asyncHandler(userController.changePassword));
userRoutes.delete('/me', asyncHandler(userController.deleteAccount));

export const preferenceRoutes = Router();

preferenceRoutes.get('/', asyncHandler(userController.getPreferences));
preferenceRoutes.put('/', validate({ body: updatePreferencesSchema }), asyncHandler(userController.updatePreferences));

export const categoryRoutes = Router();

categoryRoutes.get('/', asyncHandler(userController.listCategories));
