import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

interface TokenPayload {
  sub: string;
}

export function ensureAuthenticated(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Token de autenticação não informado.'));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.userId = payload.sub;
    return next();
  } catch {
    return next(AppError.unauthorized('Sessão inválida ou expirada. Faça login novamente.'));
  }
}

/** Retorna o id do usuário autenticado (garantido pelo middleware). */
export function currentUserId(req: Request): string {
  if (!req.userId) throw AppError.unauthorized();
  return req.userId;
}
