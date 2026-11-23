import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import fs from 'node:fs';
import path from 'node:path';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { routes } from './routes';

/**
 * Pasta com o build do frontend (frontend/dist). Quando existe — em produção,
 * após "npm run build" no frontend — a própria API serve as telas, e o sistema
 * inteiro fica disponível em um único endereço.
 */
const FRONTEND_DIST = process.env.FRONTEND_DIST ?? path.resolve(__dirname, '../../frontend/dist');

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          // Fonte "Plus Jakarta Sans" carregada do Google Fonts.
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        },
      },
    }),
  );
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()) }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', routes);

  const indexHtml = path.join(FRONTEND_DIST, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(FRONTEND_DIST, { index: false, maxAge: '1h' }));
    // Rotas do React Router (ex.: /agenda, /tarefas) devolvem o index.html.
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(indexHtml));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
