import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';
import { categoryService } from '../src/services/category.service';

export const hasDatabase = Boolean(process.env.DATABASE_URL_TEST);

export const app = createApp();

export async function resetDatabase() {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.scheduleSuggestion.deleteMany(),
    prisma.pomodoroSession.deleteMany(),
    prisma.commute.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.recurringAppointment.deleteMany(),
    prisma.task.deleteMany(),
    prisma.userPreference.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  await categoryService.ensureDefaults();
}

let counter = 0;

/** Cria um usuário e retorna o token JWT. */
export async function createUser(name = 'Usuária Teste') {
  counter++;
  const email = `teste${counter}-${Date.now()}@exemplo.com`;
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'Senha1234', confirmPassword: 'Senha1234' });
  return { token: response.body.token as string, user: response.body.user, email };
}

export async function categoryId(slug: string) {
  const category = await prisma.category.findUniqueOrThrow({ where: { slug } });
  return category.id;
}

export { prisma, request };
