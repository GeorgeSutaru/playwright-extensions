import { Reporter, FullConfig, FullResult, TestError } from '@playwright/test/reporter';
import { ReporterConfig, DefaultReporterConfig } from './config.js';
import { ReporterClient } from './client.js';
import * as fs from 'fs';
import * as path from 'path';

interface TestContext {
  testId: string;
  startTime: number;
  actionIndex: number;
  actions: Array<Record<string, unknown>>;
}

const testContexts = new Map<string, TestContext>();

export class ExtendedReporter implements Reporter {
  private config: Required<Omit<ReporterConfig, 'apiKey' | 'projectName' | 'runTitle'>> & Pick<ReporterConfig, 'projectName' | 'runTitle'>;
  private client: ReporterClient;
  private runId: string | null = null;
  private runPromise: Promise<string> | null = null;
  private errors: TestError[] = [];
  private pendingUploads: Array<{testId: string, name: string, fileName: string, filePath: string}> = [];
  private pendingRequests: Promise<any>[] = [];

  constructor(userConfig?: ReporterConfig) {
    this.config = {
      ...DefaultReporterConfig,
      ...userConfig,
    };
    this.client = new ReporterClient(this.config);
  }

  onBegin(config: FullConfig): void {
    const rawProjectName = this.config.projectName || process.env.REPORTER_PROJECT_NAME || 'default';
    const runName = this.config.runTitle || process.env.REPORTER_RUN_TITLE || `${rawProjectName} - ${new Date().toISOString()}`;

    const metadata: Record<string, unknown> = {
      title: runName,
      project: rawProjectName,
      configHash: this.computeConfigHash(config),
      environmentTags: {
        os: process.platform,
        nodeVersion: process.version,
        playwrightVersion: 'unknown',
      },
    };

    this.runPromise = this.client.createRun(metadata).then((id) => {
      this.runId = id;
      return id;
    });

    this.pendingRequests.push(this.runPromise);
  }

  onTestBegin(test: import('@playwright/test/reporter').TestCase, result: import('@playwright/test/reporter').TestResult): void {
    const key = this.getTestKey(test, result);
    testContexts.set(key, {
      testId: '',
      startTime: Date.now(),
      actionIndex: 0,
      actions: [],
    });
  }

  onTestEnd(test: import('@playwright/test/reporter').TestCase, result: import('@playwright/test/reporter').TestResult): void {
    if (!this.runPromise) return;

    const key = this.getTestKey(test, result);
    const ctx = testContexts.get(key);
    if (!ctx) return;

    const duration = result.duration;
    const status = this.mapStatus(result.status, test.outcome());

    const testData: Record<string, unknown> = {
      title: test.titlePath().slice(1).join(' >> '),
      file: test.location?.file ? path.basename(test.location.file) : test.titlePath()[1] || '',
      line: test.location?.line,
      status,
      durationMs: duration,
      errorText: result.errors.map((e) => e.message).join('\n') || undefined,
      errorStack: result.errors.map((e) => e.stack).join('\n') || undefined,
      retryNum: result.retry,
      metadata: {
        annotations: test.annotations,
        tags: test.tags,
        project: '',
        steps: result.steps.map(s => ({
          title: s.title,
          category: s.category,
          startTime: s.startTime.toISOString(),
          durationMs: s.duration,
          error: s.error?.message
        })),
      },
    };

    const recordPromise = this.runPromise.then((runId) => {
      return this.client.recordTest(runId, testData).then((testId) => {
        ctx.testId = testId;

        const uploadPromises: Promise<void>[] = [];
        for (const attachment of result.attachments) {
          if (this.config.artifacts.includes(attachment.name as 'video' | 'screenshot' | 'trace')) {
            const fileName = attachment.path ? path.basename(attachment.path) : `${attachment.name}.${this.getExtension(attachment.contentType || '')}`;
            
            if (attachment.body) {
              const buffer = Buffer.from(attachment.body);
              uploadPromises.push(this.client.uploadArtifact(runId, testId, attachment.name, fileName, buffer));
            } else if (attachment.path) {
              this.pendingUploads.push({
                testId,
                name: attachment.name,
                fileName,
                filePath: attachment.path
              });
            }
          }
        }
        return Promise.all(uploadPromises);
      });
    });

    this.pendingRequests.push(recordPromise);

    testContexts.delete(key);
  }

  onError(error: TestError): void {
    this.errors.push(error);
  }

  async onEnd(result: FullResult): Promise<void> {
    // Wait for all pending request promises first so that DB objects exist before artifact uploads run
    await Promise.all(this.pendingRequests);

    // Finalize run
    if (this.errors.length > 0) {
      console.log(`[reporter] ${this.errors.length} error(s) during test run`);
    }

    if (this.runId && this.pendingUploads.length > 0) {
      // Upload all queued file-based artifacts that are now safely flushed to disk.
      for (const upload of this.pendingUploads) {
        if (fs.existsSync(upload.filePath)) {
          try {
            const buffer = fs.readFileSync(upload.filePath);
            console.log(`[reporter] Native Trace Uploading: ${upload.fileName} from ${upload.filePath}`);
            await this.client.uploadArtifact(this.runId, upload.testId, upload.name, upload.fileName, buffer);
            console.log(`[reporter] Native Trace Completed: ${upload.fileName}`);
          } catch(e) {
            console.error(`[reporter] Failed trace upload for ${upload.fileName}:`, e);
          }
        } else {
          console.error(`[reporter] Pending artifact NOT FOUND on disk! ${upload.filePath}`);
        }
      }
    }
  }

  recordAction(action: any): void {
    // Called from extended fixtures to record actions
  }

  private getTestKey(test: import('@playwright/test/reporter').TestCase, result: import('@playwright/test/reporter').TestResult): string {
    return `${test.id}-${result.retry}`;
  }

  private mapStatus(status: string, outcome: 'skipped' | 'expected' | 'unexpected' | 'flaky'): string {
    if (status === 'failed') return 'failed';
    if (status === 'timedOut') return 'timedout';
    if (status === 'skipped') return 'skipped';
    if (outcome === 'flaky') return 'flaky';
    return 'passed';
  }

  private computeConfigHash(config: FullConfig): string {
    const { createHash } = require('crypto');
    const str = JSON.stringify({
      globalTimeout: config.globalTimeout,
      workers: config.workers,
      projects: config.projects.map((p) => p.name),
    });
    return createHash('sha256').update(str).digest('hex').slice(0, 16);
  }

  private getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'video/webm': 'webm',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'application/zip': 'zip',
      'text/plain': 'txt',
    };
    return map[mimeType] || 'bin';
  }
}
