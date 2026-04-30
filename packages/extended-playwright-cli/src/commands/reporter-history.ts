import { CliCommand } from './types';
import { ReporterApiClient } from '../reporter-client';

export const reporterHistoryCommand: CliCommand = {
  name: 'reporter-history',
  description: 'Query past runs of a test from the reporter server',
  async execute(args: string[]): Promise<void> {
    const client = new ReporterApiClient();
    const testIdentifier = args[0];

    if (!testIdentifier) {
      console.log('Usage: extended-playwright-cli reporter-history <test-file:line or test-title>');
      console.log('  Examples:');
      console.log('    extended-playwright-cli reporter-history tests/checkout.spec.ts:42');
      console.log('    extended-playwright-cli reporter-history "Login test"');
      return;
    }

    try {
      const parts = testIdentifier.split(':');
      const file = parts[0];
      const line = parts[1] ? parseInt(parts[1]) : undefined;

      const searchParams: Record<string, string> = { file };
      if (line) searchParams.line = line.toString();

      const data = (await client.request(
        `/api/v1/tests/search?file=${encodeURIComponent(file)}${line ? `&line=${line}` : ''}`
      )) as Record<string, unknown>;

      const tests = (data as Record<string, unknown>).tests as Array<Record<string, unknown>>;

      if (!tests || tests.length === 0) {
        console.log(`No test history found for: ${testIdentifier}`);
        return;
      }

      console.log(`\nTest history for: ${testIdentifier}`);
      console.log('─'.repeat(80));

      for (const test of tests.slice(-20).reverse()) {
        const status = (test as Record<string, unknown>).status as string;
        const statusIcon = status === 'passed' ? '✓' : status === 'failed' ? '✗' : status === 'flaky' ? '~' : '○';
        const duration = (test as Record<string, unknown>).durationMs as number;
        const runId = (test as Record<string, unknown>).runId as string;
        const title = (test as Record<string, unknown>).title as string;

        console.log(`  ${statusIcon} ${title}`);
        console.log(`    Run: ${runId.slice(0, 8)}... | Duration: ${duration ? `${duration}ms` : '-'} | Status: ${status}`);

        if (status === 'failed') {
          const error = (test as Record<string, unknown>).errorText as string;
          if (error) {
            console.log(`    Error: ${error.slice(0, 100)}`);
          }
        }
        console.log();
      }
    } catch (err) {
      console.error(`Error querying reporter: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  },
};
