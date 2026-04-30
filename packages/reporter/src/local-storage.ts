import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { ReporterConfig, DefaultReporterConfig } from './config.js';

export class LocalStorage {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  async initRun(runId: string, metadata: Record<string, unknown>): Promise<void> {
    const runDir = path.join(this.baseDir, 'runs', runId);
    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(
      path.join(runDir, 'run.json'),
      JSON.stringify({ id: runId, ...metadata }, null, 2)
    );
  }

  async saveTest(testId: string, runId: string, testData: Record<string, unknown>): Promise<void> {
    const testDir = path.join(this.baseDir, 'runs', runId, 'tests', testId);
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(
      path.join(testDir, 'test.json'),
      JSON.stringify({ id: testId, ...testData }, null, 2)
    );
  }

  async saveActions(testId: string, runId: string, actions: Array<Record<string, unknown>>): Promise<void> {
    const testDir = path.join(this.baseDir, 'runs', runId, 'tests', testId);
    await fs.mkdir(testDir, { recursive: true });
    const lines = actions.map((a) => JSON.stringify(a)).join('\n');
    await fs.writeFile(path.join(testDir, 'actions.jsonl'), lines);
  }

  async saveArtifact(
    testId: string,
    runId: string,
    type: string,
    filename: string,
    content: Buffer
  ): Promise<string> {
    const artifactsDir = path.join(this.baseDir, 'runs', runId, 'tests', testId, 'artifacts');
    await fs.mkdir(artifactsDir, { recursive: true });
    const storagePath = path.join(runId, testId, filename);
    await fs.writeFile(path.join(artifactsDir, filename), content);
    return storagePath;
  }

  async saveSnapshot(
    testId: string,
    runId: string,
    fingerprint: string,
    type: 'before' | 'after',
    html: string
  ): Promise<void> {
    const snapshotsDir = path.join(this.baseDir, 'runs', runId, 'tests', testId, 'snapshots');
    await fs.mkdir(snapshotsDir, { recursive: true });
    const filename = `${fingerprint}.${type}.html`;
    await fs.writeFile(path.join(snapshotsDir, filename), html);
  }

  async listRuns(): Promise<string[]> {
    const runsDir = path.join(this.baseDir, 'runs');
    try {
      const entries = await fs.readdir(runsDir);
      return entries.filter(async (e) => {
        const stat = await fs.stat(path.join(runsDir, e));
        return stat.isDirectory();
      });
    } catch {
      return [];
    }
  }
}
