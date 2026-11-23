import 'dotenv/config';
import { execSync } from 'node:child_process';

/**
 * Aplica as migrations no schema de testes antes da suíte.
 * Sem DATABASE_URL_TEST, apenas os testes unitários são executados.
 */
export default function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) {
    console.warn('⚠️  DATABASE_URL_TEST não definida — testes de integração serão ignorados.');
    return;
  }
  execSync('npx prisma migrate reset --force --skip-seed --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
