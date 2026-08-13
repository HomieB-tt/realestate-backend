import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { pool } from './config/db';
import { router } from './delivery/http/routes';
import { errorHandler } from './delivery/http/middleware/error.middleware';

function buildApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  // Liveness/readiness probe for Kubernetes.
  app.get('/healthz', async (_req: Request, res: Response) => {
    try {
      await pool.query('select 1');
      res.status(200).json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });

  app.use('/api/v1', router);

  // 404 fallback for unmatched routes.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'not_found', message: 'Route not found' });
  });

  // Must be registered last: Express only routes here when a handler
  // throws or calls next(err).
  app.use(errorHandler);

  return app;
}

function main(): void {
  const app = buildApp();
  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on :${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`[server] received ${signal}, shutting down gracefully`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
    // Force-exit if graceful shutdown hangs (e.g. a stuck connection).
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main();
