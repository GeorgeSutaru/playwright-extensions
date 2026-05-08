import { FastifyInstance } from 'fastify';
import { eq, and, like, desc, inArray } from 'drizzle-orm';
import { getDatabase } from '../db.js';
import { tests, artifacts, runs } from '../schema.js';

export async function registerTestsRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/runs/:runId/tests', async (request, reply) => {
    const db = getDatabase();
    const { runId } = request.params as { runId: string };
    const body = request.body as Record<string, unknown>;

    const [test] = await db
      .insert(tests)
      .values({
        runId,
        title: body.title as string,
        file: body.file as string,
        line: (body.line as number) || undefined,
        status: body.status as 'passed' | 'failed' | 'skipped' | 'flaky' | 'timedout',
        durationMs: (body.durationMs as number) || undefined,
        errorText: (body.errorText as string) || undefined,
        errorStack: (body.errorStack as string) || undefined,
        retryNum: (body.retryNum as number) || 0,
        metadata: (body.metadata as Record<string, unknown>) || undefined,
      })
      .returning();

    const updated = await updateRunStats(db, runId);
    reply.code(201).send({ test, runStats: updated });
  });

  app.get('/api/v1/tests/:id/history', async (request, reply) => {
    const db = getDatabase();
    const { id } = request.params as { id: string };

    const [test] = await db
      .select()
      .from(tests)
      .where(eq(tests.id, id))
      .limit(1);

    if (!test) {
      reply.code(404).send({ error: 'Test not found' });
      return;
    }

    const history = await db
      .select()
      .from(tests)
      .where(and(
        eq(tests.file, test.file),
        test.line !== null ? eq(tests.line, test.line) : undefined
      ) as import('drizzle-orm').SQL)
      .orderBy(desc(tests.id));

    const testIds = history.map(t => t.id).concat(['00000000-0000-0000-0000-000000000000']);
    const traceArtifacts = await db
      .select({ testId: artifacts.testId })
      .from(artifacts)
      .where(and(inArray(artifacts.testId, testIds), eq(artifacts.type, 'trace')));
    const hasTraceSet = new Set(traceArtifacts.map(a => a.testId));

    reply.send({
      test,
      history: history.map(t => ({ ...t, hasTrace: hasTraceSet.has(t.id) })),
    });
  });

  app.get('/api/v1/tests/search', async (request, reply) => {
    const db = getDatabase();
    const query = request.query as Record<string, string>;

    const title = query.title as string | undefined;
    const file = query.file as string | undefined;
    const status = query.status as string | undefined;

    const conditions = [];

    if (title) {
      conditions.push(like(tests.title, `%${title}%`));
    }

    if (file) {
      conditions.push(like(tests.file, `%${file}%`));
    }

    if (status) {
      conditions.push(eq(tests.status, status as 'passed' | 'failed' | 'skipped' | 'flaky' | 'timedout'));
    }

    const results = await db
      .select()
      .from(tests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tests.id))
      .limit(100);

    reply.send({ tests: results });
  });
}

async function updateRunStats(db: ReturnType<typeof getDatabase>, runId: string) {
  const allTests = await db
    .select()
    .from(tests)
    .where(eq(tests.runId, runId));

  const stats = {
    totalTests: allTests.length,
    passed: allTests.filter((t) => t.status === 'passed').length,
    failed: allTests.filter((t) => t.status === 'failed').length,
    flaky: allTests.filter((t) => t.status === 'flaky').length,
    skipped: allTests.filter((t) => t.status === 'skipped').length,
  };

  await db
    .update(runs)
    .set(stats)
    .where(eq(runs.id, runId));

  return stats;
}
