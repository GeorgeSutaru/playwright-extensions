import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { getDatabase } from '../db.js';
import { traceEntries } from '../schema.js';
import { extractSnapshot } from '../snapshot-extractor.js';
import { diffLines } from 'diff';

export async function registerDiffRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/traces/diff', async (request, reply) => {
    const db = getDatabase();
    const query = request.query as Record<string, string>;

    const fingerprint = query.fingerprint as string;
    const runA = query.runA as string;
    const runB = query.runB as string;
    const snapshotType = (query.snapshotType as 'before' | 'after') || 'after';

    if (!fingerprint || !runA || !runB) {
      reply.code(400).send({
        error: 'Required parameters: fingerprint, runA, runB',
      });
      return;
    }

    const [entryA, entryB] = await Promise.all([
      db
        .select()
        .from(traceEntries)
        .where(and(
          eq(traceEntries.fingerprint, fingerprint),
          eq(traceEntries.runId, runA)
        ))
        .limit(1),
      db
        .select()
        .from(traceEntries)
        .where(and(
          eq(traceEntries.fingerprint, fingerprint),
          eq(traceEntries.runId, runB)
        ))
        .limit(1),
    ]);

    if (!entryA.length) {
      reply.code(404).send({ error: `No entry found for fingerprint in runA: ${runA}` });
      return;
    }

    if (!entryB.length) {
      reply.code(404).send({ error: `No entry found for fingerprint in runB: ${runB}` });
      return;
    }

    const a = entryA[0];
    const b = entryB[0];

    const hashMatch =
      (snapshotType === 'before'
        ? a.snapshotBeforeHash === b.snapshotBeforeHash
        : a.snapshotAfterHash === b.snapshotAfterHash);

    if (hashMatch) {
      reply.send({
        fingerprint,
        runA,
        runB,
        snapshotType,
        identical: true,
        hash: snapshotType === 'before' ? a.snapshotBeforeHash : a.snapshotAfterHash,
      });
      return;
    }

    const [htmlA, htmlB] = await Promise.all([
      extractSnapshot(a.artifactId, a.fingerprint, snapshotType),
      extractSnapshot(b.artifactId, b.fingerprint, snapshotType),
    ]);

    const diff = htmlA && htmlB
      ? diffLines(htmlA, htmlB)
      : null;

    reply.send({
      fingerprint,
      runA,
      runB,
      snapshotType,
      identical: false,
      hashA: snapshotType === 'before' ? a.snapshotBeforeHash : a.snapshotAfterHash,
      hashB: snapshotType === 'before' ? b.snapshotBeforeHash : b.snapshotAfterHash,
      htmlA: htmlA || null,
      htmlB: htmlB || null,
      diff,
    });
  });
}
