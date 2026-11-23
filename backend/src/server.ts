import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { categoryService } from './services/category.service';

async function bootstrap() {
  await prisma.$connect();
  await categoryService.ensureDefaults();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.info(`🚀 API EntreTurnos rodando em http://localhost:${env.PORT}/api`);
  });

  const shutdown = async () => {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch(async (error) => {
  console.error('Falha ao iniciar o servidor:', error);
  await prisma.$disconnect();
  process.exit(1);
});
