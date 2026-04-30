import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalStorage } from '../src/local-storage';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

let tempDir: string;

describe('LocalStorage', () => {
  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `reporter-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('saves and reads run metadata', async () => {
    const storage = new LocalStorage(tempDir);
    const runId = 'test-run-123';

    await storage.initRun(runId, {
      title: 'Test Run',
      project: 'chromium',
      startedAt: new Date().toISOString(),
    });

    const runJson = JSON.parse(
      await fs.readFile(path.join(tempDir, 'runs', runId, 'run.json'), 'utf-8')
    );

    expect(runJson.id).toBe(runId);
    expect(runJson.title).toBe('Test Run');
    expect(runJson.project).toBe('chromium');
  });

  it('saves test data', async () => {
    const storage = new LocalStorage(tempDir);
    const runId = 'test-run-123';
    const testId = 'test-456';

    await storage.initRun(runId, { title: 'Test Run' });
    await storage.saveTest(testId, runId, {
      title: 'Should login',
      file: 'tests/auth.spec.ts',
      line: 10,
      status: 'passed',
      durationMs: 1200,
    });

    const testJson = JSON.parse(
      await fs.readFile(path.join(tempDir, 'runs', runId, 'tests', testId, 'test.json'), 'utf-8')
    );

    expect(testJson.id).toBe(testId);
    expect(testJson.title).toBe('Should login');
    expect(testJson.status).toBe('passed');
  });

  it('saves actions as JSONL', async () => {
    const storage = new LocalStorage(tempDir);
    const runId = 'test-run-123';
    const testId = 'test-456';

    await storage.initRun(runId, { title: 'Test Run' });
    await storage.saveTest(testId, runId, { title: 'Test' });

    const actions = [
      { fingerprint: 'abc123', actionType: 'goto', actionIndex: 0 },
      { fingerprint: 'def456', actionType: 'click', actionIndex: 1 },
      { fingerprint: 'ghi789', actionType: 'fill', actionIndex: 2 },
    ];

    await storage.saveActions(testId, runId, actions);

    const content = await fs.readFile(
      path.join(tempDir, 'runs', runId, 'tests', testId, 'actions.jsonl'),
      'utf-8'
    );

    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0]).actionType).toBe('goto');
    expect(JSON.parse(lines[1]).actionType).toBe('click');
  });

  it('saves artifacts as binary files', async () => {
    const storage = new LocalStorage(tempDir);
    const runId = 'test-run-123';
    const testId = 'test-456';

    await storage.initRun(runId, { title: 'Test Run' });
    await storage.saveTest(testId, runId, { title: 'Test' });

    const content = Buffer.from('fake-video-data');
    await storage.saveArtifact(testId, runId, 'video', 'video.webm', content);

    const saved = await fs.readFile(
      path.join(tempDir, 'runs', runId, 'tests', testId, 'artifacts', 'video.webm')
    );

    expect(saved.toString()).toBe('fake-video-data');
  });

  it('saves snapshots by fingerprint', async () => {
    const storage = new LocalStorage(tempDir);
    const runId = 'test-run-123';
    const testId = 'test-456';

    await storage.initRun(runId, { title: 'Test Run' });
    await storage.saveTest(testId, runId, { title: 'Test' });

    const html = '<html><body><button>Submit</button></body></html>';
    await storage.saveSnapshot(testId, runId, 'abc123', 'after', html);

    const saved = await fs.readFile(
      path.join(tempDir, 'runs', runId, 'tests', testId, 'snapshots', 'abc123.after.html'),
      'utf-8'
    );

    expect(saved).toBe(html);
  });

  it('lists runs', async () => {
    const storage = new LocalStorage(tempDir);

    await storage.initRun('run-1', { title: 'Run 1' });
    await storage.initRun('run-2', { title: 'Run 2' });

    const runs = await storage.listRuns();
    expect(runs).toContain('run-1');
    expect(runs).toContain('run-2');
  });

  it('returns empty array when no runs exist', async () => {
    const storage = new LocalStorage(tempDir);
    const runs = await storage.listRuns();
    expect(runs).toEqual([]);
  });
});
