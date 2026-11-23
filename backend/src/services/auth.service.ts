import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { LoginInput, RegisterInput } from '../validators/auth.validator';

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MINUTES = 30;

export type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'createdAt'>;

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function signToken(userId: string) {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw AppError.conflict('Já existe uma conta com este e-mail.');

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        preference: { create: {} },
      },
    });

    return { user: toPublicUser(user), token: signToken(user.id) };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
    if (!user || !valid) throw AppError.unauthorized('E-mail ou senha incorretos.');
    return { user: toPublicUser(user), token: signToken(user.id) };
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.unauthorized('Usuário não encontrado.');
    return toPublicUser(user);
  },

  /**
   * Gera um token de redefinição (válido por 30 min). Apenas o hash é armazenado.
   * Sem serviço de e-mail nesta versão: em desenvolvimento o token é devolvido na resposta
   * e exibido no console do servidor.
   */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { resetToken: null };

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashResetToken(token),
        passwordResetExpires: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
      },
    });

    console.info(`🔑 Token de redefinição para ${email}: ${token}`);
    return { resetToken: env.NODE_ENV === 'production' ? null : token };
  },

  async resetPassword(token: string, password: string) {
    const user = await prisma.user.findUnique({ where: { passwordResetToken: hashResetToken(token) } });
    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new AppError('Token inválido ou expirado. Solicite uma nova redefinição.', 400);
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password), passwordResetToken: null, passwordResetExpires: null },
    });
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound('Usuário');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AppError('Senha atual incorreta.', 400);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
  },
};
