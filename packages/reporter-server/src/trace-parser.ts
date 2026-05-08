import unzipper from 'unzipper';
import fs from 'fs/promises';
import path from 'path';

const ARTIFACTS_DIR = process.env.REPORTER_ARTIFACTS_DIR || '/data/artifacts';

export interface TraceAction {
  actionType: string;
  selector?: string;
  sourceLocation?: string;
  actionIndex: number;
  wallTime: number;
  durationMs?: number;
  url?: string;
  errorText?: string;
  snapshotBeforeHash?: string;
  snapshotAfterHash?: string;
  metadata?: Record<string, unknown>;
}

export async function parseTraceFile(
  storagePath: string
): Promise<{ actions: TraceAction[]; rawEntries: Array<Record<string, unknown>> }> {
  const fullPath = path.join(ARTIFACTS_DIR, storagePath);

  const directory = await unzipper.Open.file(fullPath);
  const files = directory.files;

  let rawEntries: Array<Record<string, unknown>> = [];

  const traceFile = files.find((f) => f.path === 'trace');
  if (traceFile) {
    const content = await traceFile.buffer();
    const text = content.toString('utf-8');
    const lines = text.trim().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        rawEntries.push(entry);
      } catch {
        continue;
      }
    }
  }

  const actions: TraceAction[] = rawEntries
    .filter((e) => e.type === 'action' || e.type === 'action_after')
    .map((entry, index) => {
      const actionEntry = entry as Record<string, unknown>;
      const beforeEntry = rawEntries.find(
        (e) =>
          (e as Record<string, unknown>).actionId === (actionEntry.actionId as string) || ((e as Record<string, unknown>).actionId === ((actionEntry.before as Record<string, unknown>)?.actionId as string))
      );

      return {
        // Action entry
        actionType: (actionEntry.name as string) || (actionEntry.type as string) || 'unknown',
        selector: (actionEntry.locator as string) || (actionEntry.selector as string),
        sourceLocation: (actionEntry.loc as string) || (actionEntry.sourceLocation as string),
        actionIndex: index,
        wallTime: (actionEntry.wallTime as number) || 0,
        durationMs: (actionEntry.duration as number),
        url: (actionEntry.apiName as string)
          ? undefined
          : (actionEntry.url as string),
        errorText: (actionEntry.errorText as string),
        snapshotBeforeHash: computeSnapshotHash(beforeEntry),
        snapshotAfterHash: computeSnapshotHash(actionEntry),
        metadata: {
          apiName: actionEntry.apiName,
          class: actionEntry.class,
          code: actionEntry.code,
          wipt: actionEntry.wipt,
        },
      };
    });

  return { actions, rawEntries };
}

function computeSnapshotHash(entry: Record<string, unknown> | undefined): string | undefined {
  if (!entry) return undefined;
  const snapshot = (entry.snapshot as string) || (entry.data as string);
  if (!snapshot) return undefined;
  const { createHash } = require('crypto');
  return createHash('sha256').update(snapshot).digest('hex').slice(0, 16);
}
