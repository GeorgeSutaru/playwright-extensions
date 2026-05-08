import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifyView from '@fastify/view';
import fastifyCors from '@fastify/cors';
import ejs from 'ejs';
import path from 'path';
import { registerRoutes } from './routes/index.js';

import { desc, count, sum } from 'drizzle-orm';
import { getDatabase } from './db.js';
import { runs } from './schema.js';

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.REPORTER_LOG_LEVEL || 'info',
    },
  });

  await app.register(fastifyCors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 100 * 1024 * 1024,
    },
  });

  await app.register(fastifyView, {
    engine: {
      ejs: ejs,
    },
    root: path.join(__dirname, 'views'),
  });

  await app.register(fastifyStatic, {
    root: path.join(__dirname, 'static'),
    prefix: '/static/',
  });

  await registerRoutes(app);

  // Page routes
  app.get('/', async (_request, reply) => {
    const db = getDatabase();
    
    // Get latest 10 runs
    const latestRuns = await db.select().from(runs).orderBy(desc(runs.startedAt)).limit(10);
    
    // Calculate global stats
    const [counts] = await db
      .select({
        totalRuns: count(runs.id),
        totalTests: sum(runs.totalTests).mapWith(Number),
        totalPassed: sum(runs.passed).mapWith(Number),
        totalFailed: sum(runs.failed).mapWith(Number),
      })
      .from(runs);

    const runCount = counts?.totalRuns || 0;
    const testCount = counts?.totalTests || 0;
    const passedCount = counts?.totalPassed || 0;
    const failedCount = counts?.totalFailed || 0;
    
    const passRate = testCount > 0 ? Math.round((passedCount / testCount) * 100) : 0;

    return reply.view('dashboard.ejs', {
      title: 'Dashboard',
      currentView: 'dashboard',
      runs: latestRuns,
      stats: {
        totalRuns: runCount,
        totalTests: testCount,
        passRate: passRate,
        totalFailed: failedCount,
      },
      formatDate,
      formatDuration,
    });
  });

  app.get('/runs', async (_request, reply) => {
    return reply.view('runs.ejs', {
      title: 'Runs',
      currentView: 'runs',
    });
  });

  app.get('/runs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.view('run-detail.ejs', {
      title: 'Run Detail',
      currentView: 'runs',
      runId: id,
    });
  });

  app.get('/test/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return reply.view('test-history.ejs', {
      title: 'Test History',
      currentView: 'runs',
      testId: id,
      runId: '',
    });
  });

  app.get('/trace/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDatabase();
    
    // Find the trace artifact for this test
    const testArtifacts = await db.select().from(require('./schema.js').artifacts).where(require('drizzle-orm').eq(require('./schema.js').artifacts.testId, id));
    const traceArtifact = testArtifacts.find((a: any) => a.type === 'trace');
    
    if (traceArtifact) {
      const serverUrl = process.env.REPORTER_PUBLIC_URL || `${request.protocol}://${request.headers.host}`;
      const traceUrl = `${serverUrl}/api/v1/artifacts/${traceArtifact.id}/download`;
      return reply.redirect(`https://trace.playwright.dev/?trace=${encodeURIComponent(traceUrl)}`);
    } else {
      return reply.code(404).send('Trace not found');
    }
  });

  app.get('/trends', async (_request, reply) => {
    return reply.view('trends.ejs', {
      title: 'Trends',
      currentView: 'trends',
    });
  });

  return app;
}

function formatDate(dateStr: string | Date | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

function formatDuration(end: string | Date | undefined, start: string | Date | undefined): string {
  if (!end || !start) return '-';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}
