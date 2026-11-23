import { Request, Response } from 'express';
import { currentUserId } from '../middlewares/auth';
import { authService } from '../services/auth.service';
import { categoryService } from '../services/category.service';
import { preferenceService, userService } from '../services/user.service';

export const userController = {
  async updateProfile(req: Request, res: Response) {
    res.json({ user: await userService.updateProfile(currentUserId(req), req.body) });
  },

  async changePassword(req: Request, res: Response) {
    await authService.changePassword(currentUserId(req), req.body.currentPassword, req.body.newPassword);
    res.json({ message: 'Senha alterada com sucesso.' });
  },

  async deleteAccount(req: Request, res: Response) {
    await userService.deleteAccount(currentUserId(req));
    res.status(204).send();
  },

  async getPreferences(req: Request, res: Response) {
    res.json(await preferenceService.get(currentUserId(req)));
  },

  async updatePreferences(req: Request, res: Response) {
    res.json(await preferenceService.update(currentUserId(req), req.body));
  },

  async listCategories(_req: Request, res: Response) {
    res.json(await categoryService.list());
  },
};
