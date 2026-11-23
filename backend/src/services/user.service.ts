import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { UpdatePreferencesInput } from '../validators/user.validator';
import { toPublicUser } from './auth.service';
import { timeToMinutes } from '../utils/timezone';

export const userService = {
  async updateProfile(userId: string, data: { name: string; email: string }) {
    const emailOwner = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailOwner && emailOwner.id !== userId) {
      throw AppError.conflict('Este e-mail já está em uso por outra conta.');
    }
    const user = await prisma.user.update({ where: { id: userId }, data });
    return toPublicUser(user);
  },

  async deleteAccount(userId: string) {
    await prisma.user.delete({ where: { id: userId } });
  },
};

export const preferenceService = {
  /** Retorna as preferências do usuário, criando os valores padrão se ainda não existirem. */
  async get(userId: string) {
    return prisma.userPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  },

  async update(userId: string, data: UpdatePreferencesInput) {
    const current = await this.get(userId);
    const start = data.availabilityStart ?? current.availabilityStart;
    const end = data.availabilityEnd ?? current.availabilityEnd;
    if (timeToMinutes(end) <= timeToMinutes(start)) {
      throw new AppError('O fim da disponibilidade deve ser após o início.', 422);
    }
    return prisma.userPreference.update({ where: { userId }, data });
  },
};
