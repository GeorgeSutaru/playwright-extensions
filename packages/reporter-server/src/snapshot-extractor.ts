import unzipper from 'unzipper';
import path from 'path';
import fs from 'fs/promises';

const ARTIFACTS_DIR = process.env.REPORTER_ARTIFACTS_DIR || '/data/artifacts';
const SNAPSHOTS_CACHE_DIR = process.env.REPORTER_SNAPSHOTS_DIR || '/data/snapshots';

export async function extractSnapshot(
  artifactId: string,
  fingerprint: string,
  type: 'before' | 'after'
): Promise<string | null> {
  const cacheKey = `${fingerprint}.${type}.html`;
  const cachePath = path.join(SNAPSHOTS_CACHE_DIR, cacheKey);

  try {
    return await fs.readFile(cachePath, 'utf-8');
  } catch {
    // Not cached, extract from trace
  }

  const artifactPath = path.join(ARTIFACTS_DIR, artifactId);
  let storagePath = artifactId;

  if (!artifactPath.startsWith(ARTIFACTS_DIR)) {
    storagePath = artifactId;
  }

  try {
    const fullPath = path.join(ARTIFACTS_DIR, storagePath);
    const directory = await unzipper.Open.file(fullPath);
    const files = directory.files;

    const traceFile = files.find((f) => f.path === 'trace');
    if (!traceFile) return null;

    const content = await traceFile.buffer();
    const text = content.toString('utf-8');
    const lines = text.trim().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);

        const entryFingerprint = entry.fingerprint || generateFingerprint(entry);
        if (entryFingerprint !== fingerprint) continue;

        const snapshot = type === 'before'
          ? (entry.before?.snapshot as string) || (entry.snapshot as string)
          : (entry.after?.snapshot as string) || (entry.snapshot as string);

        if (snapshot) {
          await fs.mkdir(SNAPSHOTS_CACHE_DIR, { recursive: true });
          await fs.writeFile(cachePath, snapshot);
          return snapshot;
        }
      } catch {
        continue;
      }
    }
  } catch (err) {
    console.error(`Failed to extract snapshot for ${fingerprint}:`, err);
  }

  return null;
}

function generateFingerprint(entry: Record<string, unknown>): string {
  const name = (entry.name as string) || '';
  const locator = (entry.locator as string) || '';
  const loc = (entry.loc as string) || '';
  const apiName = (entry.apiName as string) || '';
  const raw = `${apiName || name}|${locator}|${loc}`;
  const { createHash } = require('crypto');
  return createHash('sha256').update(raw).digest('hex').slice(0, 16);
}
