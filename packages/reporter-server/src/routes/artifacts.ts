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

    const typeField = data.fields.type;
    const typeValue = (typeField && typeof typeField === 'object' && 'value' in typeField) 
      ? String(typeField.value)
      : String(typeField);
      
    const type = typeValue as 'video' | 'screenshot' | 'trace';

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${data.filename}`;
    const relativePath = `${runId}/${testId}/${filename}`;
    const fullPath = path.join(ARTIFACTS_DIR, relativePath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const buffer = await data.toBuffer();
    await fs.writeFile(fullPath, buffer);

    const [artifact] = await db
      .insert(artifacts)
      .values({
        testId,
        type,
        storagePath: relativePath,
        sizeBytes: buffer.length,
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

  app.get('/api/v1/artifacts/:id/download', async (request, reply) => {
    const db = getDatabase();
    const { id } = request.params as { id: string };

    const [artifact] = await db
      .select()
      .from(artifacts)
      .where(eq(artifacts.id, id));

    if (!artifact) {
      reply.code(404).send({ error: 'Artifact not found' });
      return;
    }

    const fullPath = path.join(ARTIFACTS_DIR, artifact.storagePath);
    try {
      const buffer = await fs.readFile(fullPath);
      reply.header('Content-Type', artifact.mimeType || 'application/octet-stream');
      reply.header('Access-Control-Allow-Origin', '*');
      reply.send(buffer);
    } catch (err) {
      reply.code(404).send({ error: 'File not found on disk' });
    }
  });
}
