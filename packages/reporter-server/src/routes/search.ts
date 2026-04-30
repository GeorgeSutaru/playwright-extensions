import { FastifyInstance } from 'fastify';
import { and, like, desc, ilike, or, eq } from 'drizzle-orm';
import { getDatabase } from '../db.js';
import { traceEntries } from '../schema.js';

export async function registerSearchRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/traces/search', async (request, reply) => {
    const db = getDatabase();
    const query = request.query as Record<string, string>;

    const q = query.q as string;
    const runId = query.runId as string | undefined;
    const actionType = query.actionType as string | undefined;
    const limit = Math.min(parseInt(query.limit || '100'), 500);

    if (!q && !runId && !actionType) {
      reply.code(400).send({ error: 'Provide at least one filter: q, runId, or actionType' });
      return;
    }

    const conditions = [];

    if (q) {
      conditions.push(
        or(
          ilike(traceEntries.actionType, `%${q}%`),
          ilike(traceEntries.selector, `%${q}%`),
          ilike(traceEntries.errorText, `%${q}%`),
          ilike(traceEntries.url, `%${q}%`),
          ilike(traceEntries.fingerprint, `%${q}%`)
        )
      );
    }

    if (runId) {
      conditions.push(eq(traceEntries.runId, runId));
    }

    if (actionType) {
      conditions.push(eq(traceEntries.actionType, actionType));
    }

    const entries = await db
      .select()
      .from(traceEntries)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(traceEntries.id))
      .limit(limit);

    reply.send({ entries, count: entries.length });
  });
}
