import { CliCommand } from './types';
import { ReporterApiClient } from '../reporter-client';
import fs from 'fs/promises';
import path from 'path';

export const reporterImportCommand: CliCommand = {
  name: 'reporter-import',
  description: 'Import locally stored reports into the reporter server',
  async execute(args: string[]): Promise<void> {
    const client = new ReporterApiClient();
    const localPath = args[0];

    if (!localPath) {
      console.log('Usage: extended-playwright-cli reporter-import <local-report-directory>');
      console.log('  Imports reports from .playwright-reporter/ format into the server.');
      console.log('');
      console.log('  Example:');
      console.log('    extended-playwright-cli reporter-import ./.playwright-reporter/runs/my-run');
      return;
    }

    try {
      const resolvedPath = path.resolve(localPath);
      const stat = await fs.stat(resolvedPath);

      if (!stat.isDirectory()) {
        console.error('Path must be a directory');
        process.exitCode = 1;
        return;
      }

      const runJsonPath = path.join(resolvedPath, 'run.json');
      let runData: Record<string, unknown>;

      try {
        runData = JSON.parse(await fs.readFile(runJsonPath, 'utf-8'));
      } catch {
        console.error('No run.json found in directory');
        process.exitCode = 1;
        return;
      }

      const testsDir = path.join(resolvedPath, 'tests');
      const testEntries: Array<Record<string, unknown>> = [];
      const artifactEntries: Array<Record<string, unknown>> = [];
      const traceEntries: Array<Record<string, unknown>> = [];

      try {
        const testDirs = await fs.readdir(testsDir);

        for (const testDir of testDirs) {
          const testPath = path.join(testsDir, testDir);
          const testStat = await fs.stat(testPath);

          if (!testStat.isDirectory()) continue;

          const testJsonPath = path.join(testPath, 'test.json');
          let testData: Record<string, unknown> | undefined;
          try {
            testData = JSON.parse(await fs.readFile(testJsonPath, 'utf-8'));
          } catch {
            continue;
          }

          if (!testData) continue;
          testEntries.push(testData);

          const actionsPath = path.join(testPath, 'actions.jsonl');
          try {
            const actionsContent = await fs.readFile(actionsPath, 'utf-8');
            const actions = actionsContent
              .trim()
              .split('\n')
              .map((line) => JSON.parse(line));

            for (const action of actions) {
              traceEntries.push({
                ...action,
                testId: testData.id,
              });
            }
          } catch {
            // No actions file
          }

          const artifactsDir = path.join(testPath, 'artifacts');
          try {
            const artifacts = await fs.readdir(artifactsDir);
            for (const artifact of artifacts) {
              const artifactPath = path.join(artifactsDir, artifact);
              const artifactStat = await fs.stat(artifactPath);
              const ext = path.extname(artifact).slice(1);
              const typeMap: Record<string, string> = {
                webm: 'video',
                png: 'screenshot',
                jpg: 'screenshot',
                jpeg: 'screenshot',
                zip: 'trace',
              };

              artifactEntries.push({
                _localId: artifact,
                testId: testData.id,
                type: typeMap[ext] || 'screenshot',
                storagePath: path.join((runData as Record<string, unknown>).id as string, testData.id as string, artifact),
                sizeBytes: artifactStat.size,
              });
            }
          } catch {
            // No artifacts directory
          }
        }
      } catch {
        // No tests directory
      }

      const importData = {
        run: runData,
        tests: testEntries,
        artifacts: artifactEntries,
        traceEntries,
      };

      const result = await client.importRun(importData);
      const res = result as Record<string, unknown>;

      console.log(`Import complete:`);
      console.log(`  Run ID: ${res.runId}`);
      console.log(`  Tests imported: ${res.testsImported}`);
      console.log(`  Artifacts imported: ${res.artifactsImported}`);
      console.log(`  Trace entries imported: ${res.traceEntriesImported}`);
    } catch (err) {
      console.error(`Error importing reports: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  },
};
