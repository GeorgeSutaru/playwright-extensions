import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

let tempDir: string;
let artifactsDir: string;
let snapshotsDir: string;

describe('extractSnapshot', () => {
  beforeEach(async () => {
    vi.resetModules();
    tempDir = path.join(os.tmpdir(), `snapshot-test-${Date.now()}`);
    artifactsDir = path.join(tempDir, 'artifacts');
    snapshotsDir = path.join(tempDir, 'snapshots');
    await fs.mkdir(artifactsDir, { recursive: true });
    await fs.mkdir(snapshotsDir, { recursive: true });
    process.env.REPORTER_ARTIFACTS_DIR = artifactsDir;
    process.env.REPORTER_SNAPSHOTS_DIR = snapshotsDir;
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    delete process.env.REPORTER_ARTIFACTS_DIR;
    delete process.env.REPORTER_SNAPSHOTS_DIR;
  });

  it('returns null for non-existent trace file', async () => {
    const { extractSnapshot } = await import('../src/snapshot-extractor');
    const result = await extractSnapshot('non-existent', 'abc123', 'after');
    expect(result).toBeNull();
  });

  it('caches extracted snapshots', async () => {
    const { extractSnapshot } = await import('../src/snapshot-extractor');
    const cachePath = path.join(snapshotsDir, 'abc123.after.html');
    const html = '<html><body><button>Submit</button></body></html>';
    await fs.writeFile(cachePath, html);

    const result = await extractSnapshot('any-id', 'abc123', 'after');
    expect(result).toBe(html);
  });

  it('returns different results for before vs after', async () => {
    const { extractSnapshot } = await import('../src/snapshot-extractor');
    await fs.writeFile(
      path.join(snapshotsDir, 'abc123.before.html'),
      '<html><body>Before</body></html>'
    );
    await fs.writeFile(
      path.join(snapshotsDir, 'abc123.after.html'),
      '<html><body>After</body></html>'
    );

    const before = await extractSnapshot('any-id', 'abc123', 'before');
    const after = await extractSnapshot('any-id', 'abc123', 'after');

    expect(before).toContain('Before');
    expect(after).toContain('After');
  });
});
