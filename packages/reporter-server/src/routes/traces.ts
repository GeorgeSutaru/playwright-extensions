import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { getDatabase } from '../db.js';
import { traceEntries, artifacts } from '../schema.js';

export async function registerTracesRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/runs/:runId/tests/:testId/trace', async (request, reply) => {
    const db = getDatabase();
    const { runId, testId } = request.params as { runId: string; testId: string };
    const body = request.body as Record<string, unknown>;

    const entries = (body.entries as Array<Record<string, unknown>>) || [];

    const [artifact] = await db
      .insert(artifacts)
      .values({
        testId,
        type: 'trace',
        storagePath: (body.storagePath as string) || '',
        sizeBytes: (body.sizeBytes as number) || 0,
        mimeType: 'application/zip',
      })
      .returning();

    const insertEntries = entries.map((entry) => ({
      artifactId: artifact.id,
      testId,
      runId,
      fingerprint: entry.fingerprint as string,
      actionType: (entry.actionType as string) || undefined,
      selector: (entry.selector as string) || undefined,
      sourceLocation: (entry.sourceLocation as string) || undefined,
      actionIndex: (entry.actionIndex as number) || undefined,
      wallTime: (entry.wallTime as number) || undefined,
      durationMs: (entry.durationMs as number) || undefined,
      url: (entry.url as string) || undefined,
      errorText: (entry.errorText as string) || undefined,
      snapshotBeforeHash: (entry.snapshotBeforeHash as string) || undefined,
      snapshotAfterHash: (entry.snapshotAfterHash as string) || undefined,
      metadata: (entry.metadata as Record<string, unknown>) || undefined,
    }));

    if (insertEntries.length > 0) {
      await db.insert(traceEntries).values(insertEntries);
    }

    reply.code(201).send({
      artifact,
      entriesIndexed: insertEntries.length,
    });
  });

  app.get('/api/v1/tests/:testId/trace-entries', async (request, reply) => {
    const db = getDatabase();
    const { testId } = request.params as { testId: string };

    const entries = await db
      .select()
      .from(traceEntries)
      .where(eq(traceEntries.testId, testId))
      .orderBy(traceEntries.actionIndex);

    reply.send({ entries });
  });

  app.post('/api/v1/traces/reindex', async (request, reply) => {
    const db = getDatabase();
    const body = request.body as Record<string, unknown>;
    const artifactId = body.artifactId as string;

    const [artifact] = await db
      .select()
      .from(artifacts)
      .where(eq(artifacts.id, artifactId))
      .limit(1);

    if (!artifact) {
      reply.code(404).send({ error: 'Artifact not found' });
      return;
    }

    const entries = (body.entries as Array<Record<string, unknown>>) || [];
    const insertEntries = entries.map((entry) => ({
      artifactId: artifact.id,
      testId: artifact.testId,
      runId: (body.runId as string) || '',
      fingerprint: entry.fingerprint as string,
      actionType: (entry.actionType as string) || undefined,
      selector: (entry.selector as string) || undefined,
      sourceLocation: (entry.sourceLocation as string) || undefined,
      actionIndex: (entry.actionIndex as number) || undefined,
      wallTime: (entry.wallTime as number) || undefined,
      durationMs: (entry.durationMs as number) || undefined,
      url: (entry.url as string) || undefined,
      errorText: (entry.errorText as string) || undefined,
      snapshotBeforeHash: (entry.snapshotBeforeHash as string) || undefined,
      snapshotAfterHash: (entry.snapshotAfterHash as string) || undefined,
      metadata: (entry.metadata as Record<string, unknown>) || undefined,
    }));

    if (insertEntries.length > 0) {
      await db.insert(traceEntries).values(insertEntries);
    }

    reply.send({
      artifactId: artifact.id,
      entriesIndexed: insertEntries.length,
    });
  });
}
