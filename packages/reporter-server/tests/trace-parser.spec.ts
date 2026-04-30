import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import os from 'os';
import path from 'path';
import archiver from 'archiver';

let tempDir: string;

describe('parseTraceFile', () => {
  beforeEach(async () => {
    vi.resetModules();
    tempDir = path.join(os.tmpdir(), `trace-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    process.env.REPORTER_ARTIFACTS_DIR = tempDir;
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    delete process.env.REPORTER_ARTIFACTS_DIR;
  });

  async function createTestTrace(entries: Array<Record<string, unknown>>): Promise<string> {
    const zipPath = path.join(tempDir, 'test.zip');
    const traceContent = entries.map((e) => JSON.stringify(e)).join('\n');

    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(zipPath);
      stream.on('error', reject);
      stream.on('close', resolve);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', reject);
      archive.pipe(stream);
      archive.append(traceContent, { name: 'trace' });
      archive.finalize();
    });

    return 'test.zip';
  }

  it('parses trace entries and extracts actions', async () => {
    const entries = [
      {
        type: 'action',
        name: 'click',
        apiName: 'locator.click',
        locator: 'text=Submit',
        wallTime: 1000,
        duration: 50,
        fingerprint: 'abc123def456',
      },
      {
        type: 'action',
        name: 'fill',
        apiName: 'locator.fill',
        locator: 'css=input[name=email]',
        wallTime: 1500,
        duration: 30,
        fingerprint: 'def456abc123',
      },
    ];

    const storagePath = await createTestTrace(entries);
    const { parseTraceFile } = await import('../src/trace-parser');
    const { actions } = await parseTraceFile(storagePath);

    expect(actions).toHaveLength(2);
    expect(actions[0].actionType).toBe('click');
    expect(actions[0].fingerprint).toBe('abc123def456');
    expect(actions[1].actionType).toBe('fill');
  });

  it('handles empty trace file', async () => {
    const storagePath = await createTestTrace([]);
    const { parseTraceFile } = await import('../src/trace-parser');
    const { actions } = await parseTraceFile(storagePath);
    expect(actions).toEqual([]);
  });

  it('generates fingerprint when not provided', async () => {
    const entries = [
      {
        type: 'action',
        name: 'goto',
        apiName: 'page.goto',
        wallTime: 0,
        duration: 100,
      },
    ];

    const storagePath = await createTestTrace(entries);
    const { parseTraceFile } = await import('../src/trace-parser');
    const { actions } = await parseTraceFile(storagePath);

    expect(actions).toHaveLength(1);
    expect(actions[0].fingerprint).toBeDefined();
    expect(actions[0].fingerprint).toHaveLength(16);
  });
});
