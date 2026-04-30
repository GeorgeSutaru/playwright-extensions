import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, asc, and, like, gte, lte, count } from 'drizzle-orm';
import { getDatabase } from '../db.js';
import * as schema from '../schema.js';
import { runs, tests } from '../schema.js';

export async function registerRunsRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/runs', async (request: FastifyRequest, reply: FastifyReply) => {
    const db = getDatabase();
    const body = request.body as Record<string, unknown>;

    const [run] = await db
      .insert(runs)
      .values({
        title: (body.title as string) || undefined,
        project: (body.project as string) || undefined,
        configHash: (body.configHash as string) || undefined,
        environmentTags: (body.environmentTags as Record<string, unknown>) || undefined,
        source: (body.source as string) || 'live',
      })
      .returning();

    reply.code(201).send(run);
  });

  app.get('/api/v1/runs', async (request: FastifyRequest, reply: FastifyReply) => {
    const db = getDatabase();
    const query = request.query as Record<string, string>;

    const limit = Math.min(parseInt(query.limit || '50'), 200);
    const offset = parseInt(query.offset || '0');
    const status = query.status as string | undefined;
    const project = query.project as string | undefined;
    const from = query.from as string | undefined;
    const to = query.to as string | undefined;
    const search = query.search as string | undefined;

    const conditions = [];

    if (status) {
      if (status === 'passed') {
        conditions.push(eq(runs.failed, 0));
      } else if (status === 'failed') {
        conditions.push(gte(runs.failed, 1));
      }
    }

    if (project) {
      conditions.push(eq(runs.project, project));
    }

    if (from) {
      conditions.push(gte(runs.startedAt, new Date(from)));
    }

    if (to) {
      conditions.push(lte(runs.startedAt, new Date(to)));
    }

    let whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [runList, totalCount] = await Promise.all([
      db
        .select()
        .from(runs)
        .where(whereClause)
        .orderBy(desc(runs.startedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(runs)
        .where(whereClause)
        .then((r) => Number(r[0].count)),
    ]);

    const runsWithTests = await Promise.all(
      runList.map(async (run) => {
        const testResults = await db
          .select()
          .from(tests)
          .where(eq(tests.runId, run.id))
          .limit(1000);

        return {
          ...run,
          tests: testResults,
        };
      })
    );

    reply.send({
      runs: runsWithTests,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount,
      },
    });
  });

  app.get('/api/v1/runs/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const db = getDatabase();
    const { id } = request.params as { id: string };

    const [run] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, id))
      .limit(1);

    if (!run) {
      reply.code(404).send({ error: 'Run not found' });
      return;
    }

    const testResults = await db
      .select()
      .from(tests)
      .where(eq(tests.runId, id))
      .orderBy(asc(tests.title));

    reply.send({
      ...run,
      tests: testResults,
    });
  });
}
