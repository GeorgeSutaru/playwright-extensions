import { FastifyInstance } from 'fastify';
import { registerRunsRoutes } from './runs.js';
import { registerTestsRoutes } from './tests.js';
import { registerArtifactsRoutes } from './artifacts.js';
import { registerTrendsRoutes } from './trends.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  const apiKey = process.env.REPORTER_API_KEY;

  app.addHook('onRequest', async (request, reply) => {
    if (!apiKey) return;

    if (request.url.startsWith('/static/') || request.url.startsWith('/api/')) {
      const headerKey = request.headers['x-api-key'] as string | undefined;
      if (headerKey !== apiKey) {
        void reply.code(401).send({ error: 'Unauthorized' });
        throw new Error('Unauthorized');
      }
    }
  });

  await registerRunsRoutes(app);
  await registerTestsRoutes(app);
  await registerArtifactsRoutes(app);
  await registerTrendsRoutes(app);
}
