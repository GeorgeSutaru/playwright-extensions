import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db.js';
import { artifacts, tests } from '../schema.js';
import fs from 'fs/promises';
import path from 'path';

const ARTIFACTS_DIR = process.env.REPORTER_ARTIFACTS_DIR || '/data/artifacts';

export async function registerArtifactsRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/runs/:runId/tests/:testId/artifacts', async (request, reply) => {
    const db = getDatabase();
    const { runId, testId } = request.params as { runId: string; testId: string };

    const data = await request.file({
      limits: {
        fileSize: 100 * 1024 * 1024,
      },
    });

    if (!data) {
      reply.code(400).send({ error: 'No file uploaded' });
      return;
    }

    const type = (data.fields.type as unknown as string) as 'video' | 'screenshot' | 'trace';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${data.filename}`;
    const relativePath = path.join(runId, testId, filename);
    const fullPath = path.join(ARTIFACTS_DIR, relativePath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data.file.toString());

    const [artifact] = await db
      .insert(artifacts)
      .values({
        testId,
        type,
        storagePath: relativePath,
        sizeBytes: (data.file as any).bytesRead,
        mimeType: data.mimetype,
      })
      .returning();

    reply.code(201).send(artifact);
  });

  app.get('/api/v1/runs/:runId/tests/:testId/artifacts', async (request, reply) => {
    const db = getDatabase();
    const { testId } = request.params as { testId: string };

    const results = await db
      .select()
      .from(artifacts)
      .where(eq(artifacts.testId, testId));

    reply.send({ artifacts: results });
  });
}
