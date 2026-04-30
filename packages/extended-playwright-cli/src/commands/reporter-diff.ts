import { CliCommand } from './types';
import { ReporterApiClient } from '../reporter-client';

export const reporterDiffCommand: CliCommand = {
  name: 'reporter-diff',
  description: 'Compare snapshots between two runs by fingerprint',
  async execute(args: string[]): Promise<void> {
    const client = new ReporterApiClient();

    if (args.length < 3) {
      console.log('Usage: extended-playwright-cli reporter-diff <fingerprint> <runA> <runB> [snapshot-type]');
      console.log('  fingerprint: Action fingerprint (16-char hex)');
      console.log('  runA: Baseline run ID');
      console.log('  runB: Comparison run ID');
      console.log('  snapshot-type: "before" or "after" (default: after)');
      console.log('');
      console.log('  Example:');
      console.log('    extended-playwright-cli reporter-diff a1b2c3d4e5f60708 abc123 def456 after');
      return;
    }

    const fingerprint = args[0];
    const runA = args[1];
    const runB = args[2];
    const snapshotType = args[3] || 'after';

    try {
      const data = await client.getDiff({
        fingerprint,
        runA,
        runB,
        snapshotType,
      });

      const result = data as Record<string, unknown>;

      if (result.identical) {
        console.log(`Snapshots are identical for fingerprint: ${fingerprint}`);
        console.log(`Hash: ${result.hash}`);
        return;
      }

      console.log(`Snapshot diff for fingerprint: ${fingerprint}`);
      console.log(`Run A hash: ${result.hashA}`);
      console.log(`Run B hash: ${result.hashB}`);
      console.log('─'.repeat(80));

      const diff = result.diff as Array<Record<string, unknown>> | null;
      if (diff) {
        for (const part of diff) {
          const value = (part.value as string) || '';
          const added = part.added as boolean;
          const removed = part.removed as boolean;

          if (added) {
            console.log(`+${value}`);
          } else if (removed) {
            console.log(`-${value}`);
          } else {
            console.log(` ${value}`);
          }
        }
      }
    } catch (err) {
      console.error(`Error comparing snapshots: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  },
};
