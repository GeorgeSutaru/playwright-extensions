import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db.js';
import { runs, tests, artifacts, traceEntries } from '../schema.js';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

const LOCAL_REPORTS_DIR = process.env.REPORTER_LOCAL_REPORTS_DIR || '/tmp/reports';

export async function registerImportRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/import', async (request, reply) => {
    const db = getDatabase();
    const body = request.body as Record<string, unknown>;
    const runData = body.run as Record<string, unknown>;
    const testDatas = (body.tests as Array<Record<string, unknown>>) || [];
    const artifactDatas = (body.artifacts as Array<Record<string, unknown>>) || [];
    const traceEntriesData = (body.traceEntries as Array<Record<string, unknown>>) || [];

    if (!runData) {
      reply.code(400).send({ error: 'Run data is required' });
      return;
    }

    const [run] = await db
      .insert(runs)
      .values({
        title: (runData.title as string) || undefined,
        project: (runData.project as string) || undefined,
        startedAt: runData.startedAt ? new Date(runData.startedAt as string) : undefined,
        endedAt: runData.endedAt ? new Date(runData.endedAt as string) : undefined,
        configHash: (runData.configHash as string) || undefined,
        environmentTags: (runData.environmentTags as Record<string, unknown>) || undefined,
        source: 'imported',
      })
      .returning();

    const testIdMap = new Map<string, string>();

    for (const testData of testDatas) {
      const existingId = testData._localId as string;
      const [test] = await db
        .insert(tests)
        .values({
          runId: run.id,
          title: testData.title as string,
          file: testData.file as string,
          line: (testData.line as number) || undefined,
          status: testData.status as 'passed' | 'failed' | 'skipped' | 'flaky' | 'timedout',
          durationMs: (testData.durationMs as number) || undefined,
          errorText: (testData.errorText as string) || undefined,
          errorStack: (testData.errorStack as string) || undefined,
          retryNum: (testData.retryNum as number) || 0,
          metadata: (testData.metadata as Record<string, unknown>) || undefined,
        })
        .returning();

      if (existingId) {
        testIdMap.set(existingId, test.id);
      }
    }

    const artifactIdMap = new Map<string, string>();

    for (const artifactData of artifactDatas) {
      const localTestId = artifactData.testId as string;
      const dbTestId = testIdMap.get(localTestId) || localTestId;

      const [artifact] = await db
        .insert(artifacts)
        .values({
          testId: dbTestId,
          type: artifactData.type as 'video' | 'screenshot' | 'trace',
          storagePath: artifactData.storagePath as string,
          sizeBytes: (artifactData.sizeBytes as number) || undefined,
          mimeType: (artifactData.mimeType as string) || undefined,
        })
        .returning();

      const localArtifactId = artifactData._localId as string;
      if (localArtifactId) {
        artifactIdMap.set(localArtifactId, artifact.id);
      }
    }

    const insertEntries = traceEntriesData.map((entry) => {
      const localArtifactId = entry.artifactId as string;
      const localTestId = entry.testId as string;
      return {
        artifactId: artifactIdMap.get(localArtifactId) || localArtifactId,
        testId: testIdMap.get(localTestId) || localTestId,
        runId: run.id,
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
      };
    });

    if (insertEntries.length > 0) {
      await db.insert(traceEntries).values(insertEntries);
    }

    const allTests = await db
      .select()
      .from(tests)
      .where(eq(tests.runId, run.id));

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
      .where(eq(runs.id, run.id));

    reply.code(201).send({
      runId: run.id,
      testsImported: testDatas.length,
      artifactsImported: artifactDatas.length,
      traceEntriesImported: traceEntriesData.length,
      stats,
    });
  });

  app.post('/api/v1/import/directory', async (request, reply) => {
    const db = getDatabase();
    const data = await request.file();

    if (!data) {
      reply.code(400).send({ error: 'No file uploaded' });
      return;
    }

    const tempDir = path.join(LOCAL_REPORTS_DIR, `import-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    const tarPath = path.join(tempDir, data.filename);
    await fs.writeFile(tarPath, data.file.toString());

    try {
      const { execSync } = await import('child_process');
      execSync(`tar -xzf ${tarPath} -C ${tempDir}`);

      const importResult = await importLocalDirectory(db, tempDir);
      reply.code(201).send(importResult);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
}

async function importLocalDirectory(
  db: ReturnType<typeof getDatabase>,
  dirPath: string
): Promise<{ runsImported: number }> {
  const runDirs = await fs.readdir(dirPath);
  let runsImported = 0;

  for (const runDir of runDirs) {
    const runPath = path.join(dirPath, runDir);
    const stat = await fs.stat(runPath);

    if (!stat.isDirectory()) continue;

    const runJsonPath = path.join(runPath, 'run.json');
    try {
      await fs.access(runJsonPath);
    } catch {
      continue;
    }

    const runData = JSON.parse(await fs.readFile(runJsonPath, 'utf-8'));

    const [run] = await db
      .insert(runs)
      .values({
        title: runData.title,
        project: runData.project,
        startedAt: runData.startedAt ? new Date(runData.startedAt) : undefined,
        endedAt: runData.endedAt ? new Date(runData.endedAt) : undefined,
        configHash: runData.configHash,
        environmentTags: runData.environmentTags,
        source: 'imported',
      })
      .returning();

    const testDirsPath = path.join(runPath, 'tests');
    try {
      const testDirs = await fs.readdir(testDirsPath);

      for (const testDir of testDirs) {
        const testPath = path.join(testDirsPath, testDir);
        const testJsonPath = path.join(testPath, 'test.json');

        try {
          const testData = JSON.parse(await fs.readFile(testJsonPath, 'utf-8'));
          await db.insert(tests).values({
            runId: run.id,
            title: testData.title,
            file: testData.file,
            line: testData.line,
            status: testData.status,
            durationMs: testData.durationMs,
            errorText: testData.errorText,
            errorStack: testData.errorStack,
            retryNum: testData.retryNum || 0,
            metadata: testData.metadata,
          });
        } catch {
          continue;
        }
      }
    } catch {
      // No tests directory
    }

    runsImported++;
  }

  return { runsImported };
}
