import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: `Rota ${req.method} ${req.originalUrl} não encontrada.` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message, details: error.details });
  }

  if (error instanceof ZodError) {
    return res.status(422).json({
      message: 'Dados inválidos.',
      errors: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Registro duplicado.' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Registro não encontrado.' });
    }
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ message: 'JSON inválido no corpo da requisição.' });
  }

  console.error('Erro inesperado:', error);
  return res.status(500).json({ message: 'Erro interno do servidor.' });
}
