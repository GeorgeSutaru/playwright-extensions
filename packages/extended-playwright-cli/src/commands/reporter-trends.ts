import { CliCommand } from './types';
import { ReporterApiClient } from '../reporter-client';

export const reporterTrendsCommand: CliCommand = {
  name: 'reporter-trends',
  description: 'Show pass/fail rate trends and recurring failures',
  async execute(args: string[]): Promise<void> {
    const client = new ReporterApiClient();

    const params: Record<string, string> = {};
    let i = 0;

    while (i < args.length) {
      if (args[i] === '--from' && args[i + 1]) {
        params.from = args[i + 1];
        i += 2;
      } else if (args[i] === '--to' && args[i + 1]) {
        params.to = args[i + 1];
        i += 2;
      } else if (args[i] === '--file' && args[i + 1]) {
        params.file = args[i + 1];
        i += 2;
      } else if (args[i] === '--group-by' && args[i + 1]) {
        params.groupBy = args[i + 1];
        i += 2;
      } else {
        i++;
      }
    }

    try {
      const [trendsData, failuresData] = await Promise.all([
        client.getTrends(params),
        client.getRecurringFailures(params),
      ]);

      const trends = trendsData as Record<string, unknown>;
      const timeline = (trends.timeline as Array<Record<string, unknown>>) || [];

      console.log('\nPass Rate Trend');
      console.log('─'.repeat(60));

      if (timeline.length === 0) {
        console.log('  No data available.');
      } else {
        for (const point of timeline.slice(-20)) {
          const date = (point.date as string).split('T')[0];
          const passRate = point.passRate as number;
          const passed = point.passed as number;
          const failed = point.failed as number;
          const total = point.totalTests as number;

          const barLength = 30;
          const filled = Math.round((passRate / 100) * barLength);
          const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

          console.log(`  ${date} |${bar}| ${passRate}% (${passed}/${total})`);
        }
      }

      const failures = (failuresData as Record<string, unknown>).failures as Array<Record<string, unknown>>;

      if (failures && failures.length > 0) {
        console.log('\nRecurring Failures');
        console.log('─'.repeat(60));

        for (const f of failures.slice(0, 10)) {
          const title = (f.title as string) || '';
          const file = (f.file as string) || '';
          const count = (f.failure_count as number) || 0;
          const error = (f.errorText as string) || '';

          console.log(`  ✗ ${title}`);
          console.log(`    File: ${file} | Failures: ${count}`);
          if (error) {
            console.log(`    Error: ${error.slice(0, 80)}`);
          }
          console.log();
        }
      }
    } catch (err) {
      console.error(`Error fetching trends: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  },
};
