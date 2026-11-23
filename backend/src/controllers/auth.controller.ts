import { Request, Response } from 'express';
import { currentUserId } from '../middlewares/auth';
import { authService } from '../services/auth.service';

export const authController = {
  async register(req: Request, res: Response) {
    res.status(201).json(await authService.register(req.body));
  },

  async login(req: Request, res: Response) {
    res.json(await authService.login(req.body));
  },

  async me(req: Request, res: Response) {
    res.json({ user: await authService.me(currentUserId(req)) });
  },

  async forgotPassword(req: Request, res: Response) {
    const { resetToken } = await authService.forgotPassword(req.body.email);
    res.json({
      message: 'Se o e-mail estiver cadastrado, as instruções de redefinição foram geradas.',
      // Apenas em desenvolvimento (não há serviço de e-mail nesta versão).
      resetToken,
    });
  },

  async resetPassword(req: Request, res: Response) {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ message: 'Senha redefinida com sucesso. Faça login com a nova senha.' });
  },
};
